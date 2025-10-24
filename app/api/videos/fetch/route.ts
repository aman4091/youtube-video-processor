import { NextRequest, NextResponse } from 'next/server';
import { fetchChannelVideos, getChannelIdFromHandle } from '@/lib/api/youtube';
import { saveVideos } from '@/lib/db/videos';
import { getUserChannels } from '@/lib/db/channels';
import { getSharedSetting } from '@/lib/db/settings';
import { extractChannelId } from '@/lib/utils/helpers';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get YouTube API key
    const youtubeApiKey = await getSharedSetting('youtube_api_key');
    if (!youtubeApiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    // Get user's source channels
    const channels = await getUserChannels(userId);
    if (channels.length === 0) {
      return NextResponse.json(
        { error: 'No source channels configured' },
        { status: 400 }
      );
    }

    const results = [];

    // Fetch videos for each channel
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
          results.push({
            channelUrl: channel.channel_url,
            success: false,
            error: 'Invalid channel URL',
          });
          continue;
        }

        // Fetch videos
        const videos = await fetchChannelVideos(
          channelId,
          youtubeApiKey,
          channel.min_duration_seconds,
          1000 // Max 1000 videos
        );

        // Save to database
        await saveVideos(channel.id, videos);

        results.push({
          channelUrl: channel.channel_url,
          success: true,
          videosCount: videos.length,
        });
      } catch (error: any) {
        results.push({
          channelUrl: channel.channel_url,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Error in fetch videos API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
