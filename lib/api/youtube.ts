import axios from 'axios';
import { parseDuration } from '../utils/helpers';

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      thumbnails: { high: { url: string } };
    };
  }>;
}

interface YouTubeVideoDetailsResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      thumbnails: { high: { url: string } };
    };
    statistics: {
      viewCount: string;
    };
    contentDetails: {
      duration: string;
    };
  }>;
}

export async function fetchChannelVideos(
  channelId: string,
  apiKey: string,
  minDurationSeconds: number,
  maxResults: number = 1000
): Promise<any[]> {
  try {
    // Step 1: Get channel's upload playlist ID
    const channelResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels`,
      {
        params: {
          part: 'contentDetails',
          id: channelId,
          key: apiKey,
        },
      }
    );

    if (!channelResponse.data.items?.[0]) {
      throw new Error('Channel not found');
    }

    const uploadsPlaylistId =
      channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Step 2: Fetch all video IDs from uploads playlist
    let allVideoIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const playlistResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/playlistItems`,
        {
          params: {
            part: 'contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: 50, // Max allowed by API
            pageToken,
            key: apiKey,
          },
        }
      );

      const videoIds = playlistResponse.data.items.map(
        (item: any) => item.contentDetails.videoId
      );
      allVideoIds.push(...videoIds);

      pageToken = playlistResponse.data.nextPageToken;

      // Limit to ~2000 videos to avoid too many API calls
      if (allVideoIds.length >= 2000) break;
    } while (pageToken);

    // Step 3: Fetch video details in batches
    const videos: any[] = [];
    const batchSize = 50; // YouTube API allows up to 50 IDs per request

    for (let i = 0; i < allVideoIds.length; i += batchSize) {
      const batch = allVideoIds.slice(i, i + batchSize);
      const videoResponse = await axios.get<YouTubeVideoDetailsResponse>(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            part: 'snippet,statistics,contentDetails',
            id: batch.join(','),
            key: apiKey,
          },
        }
      );

      videos.push(...videoResponse.data.items);
    }

    // Step 4: Filter by duration and sort by views
    const filteredVideos = videos
      .map((video) => ({
        video_id: video.id,
        title: video.snippet.title,
        views: parseInt(video.statistics.viewCount || '0'),
        duration_seconds: parseDuration(video.contentDetails.duration),
        thumbnail_url: video.snippet.thumbnails.high.url,
      }))
      .filter((video) => video.duration_seconds >= minDurationSeconds)
      .sort((a, b) => b.views - a.views)
      .slice(0, maxResults);

    return filteredVideos;
  } catch (error: any) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch channel videos');
  }
}

// Get channel ID from handle (e.g., @channelname)
export async function getChannelIdFromHandle(
  handle: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: 'snippet',
          q: handle,
          type: 'channel',
          maxResults: 1,
          key: apiKey,
        },
      }
    );

    if (!response.data.items?.[0]) {
      throw new Error('Channel not found');
    }

    return response.data.items[0].snippet.channelId;
  } catch (error: any) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    throw new Error('Failed to get channel ID');
  }
}
