import axios from 'axios';

export interface TranscriptResult {
  transcript: string;
  error?: string;
}

export async function fetchTranscript(
  videoId: string,
  apiKey: string
): Promise<TranscriptResult> {
  try {
    const response = await axios.post(
      'https://api.supadata.ai/v1/youtube/transcript',
      {
        video_id: videoId,
        language: 'en', // Can be made configurable
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      transcript: response.data.transcript || response.data.text || '',
    };
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error('API_KEY_EXHAUSTED');
    }

    console.error('Supadata API Error:', error.response?.data || error.message);
    return {
      transcript: '',
      error: error.response?.data?.message || 'Failed to fetch transcript',
    };
  }
}

// Test if API key is valid and has quota
export async function testSupadataApiKey(apiKey: string): Promise<boolean> {
  try {
    // Use a known public video to test
    const response = await axios.post(
      'https://api.supadata.ai/v1/youtube/transcript',
      {
        video_id: 'dQw4w9WgXcQ', // Sample video ID
        language: 'en',
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.status === 200;
  } catch (error: any) {
    if (error.response?.status === 429) {
      return false; // Exhausted
    }
    // Other errors might be temporary, so return true
    return true;
  }
}
