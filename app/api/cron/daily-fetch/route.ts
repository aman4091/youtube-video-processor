import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db/users';
import { fetchChannelVideos, getChannelIdFromHandle } from '@/lib/api/youtube';
import { saveVideos } from '@/lib/db/videos';
import { getUserChannels } from '@/lib/db/channels';
import { getSharedSetting } from '@/lib/db/settings';
import { extractChannelId } from '@/lib/utils/helpers';

// This endpoint will be called by Vercel Cron Job daily
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting daily video fetch...');

    // Get YouTube API key
    const youtubeApiKey = await getSharedSetting('youtube_api_key');
    if (!youtubeApiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    // Get all users
    const users = await getAllUsers();
    const results = [];

    for (const user of users) {
      console.log(`[Cron] Fetching videos for user: ${user.username}`);

      // Get user's source channels
      const channels = await getUserChannels(user.id);

      for (const channel of channels) {
        try {
          // Extract channel ID from URL
          let channelId = extractChannelId(channel.channel_url);

          // If it's a handle (@username), get the channel ID
          if (!channelId && channel.channel_url.includes('@')) {
            const handle = channel.channel_url.split('@')[1]?.split('/')[0];
            if (handle) {
              channelId = await getChannelIdFromHandle(`@${handle}`, youtubeApiKey);
            }
          }

          if (!channelId) {
            console.error(`[Cron] Invalid channel URL: ${channel.channel_url}`);
            continue;
          }

          // Fetch videos
          const videos = await fetchChannelVideos(
            channelId,
            youtubeApiKey,
            channel.min_duration_seconds,
            1000
          );

          // Save to database (this will add new videos and update existing ones)
          await saveVideos(channel.id, videos);

          console.log(`[Cron] Fetched ${videos.length} videos for channel: ${channel.channel_url}`);

          results.push({
            userId: user.id,
            username: user.username,
            channelUrl: channel.channel_url,
            videosCount: videos.length,
            success: true,
          });
        } catch (error: any) {
          console.error(`[Cron] Error fetching videos for channel ${channel.channel_url}:`, error);
          results.push({
            userId: user.id,
            username: user.username,
            channelUrl: channel.channel_url,
            success: false,
            error: error.message,
          });
        }
      }
    }

    console.log('[Cron] Daily video fetch completed');

    return NextResponse.json({
      success: true,
      message: 'Daily video fetch completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Error in daily fetch:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run daily fetch' },
      { status: 500 }
    );
  }
}
