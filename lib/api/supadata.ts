import axios from 'axios';

export interface TranscriptResult {
  transcript: string;
  error?: string;
}

async function pollJobResult(jobId: string, apiKey: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes max
  const pollUrl = `https://api.supadata.ai/v1/transcript/${jobId}`;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get(pollUrl, {
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      });

      const status = response.data.status;

      if (status === 'completed') {
        console.log('[SupaData] Job completed successfully');
        return processTranscriptResponse(response.data);
      } else if (status === 'failed') {
        const error = response.data.error || 'Unknown error';
        throw new Error(`Job failed: ${error}`);
      } else if (status === 'queued' || status === 'active') {
        console.log(`[SupaData] Job status: ${status}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        continue;
      } else {
        throw new Error(`Unknown job status: ${status}`);
      }
    } catch (error: any) {
      if (error.message?.includes('Job failed')) {
        throw error;
      }
      console.log(`[SupaData] Poll attempt ${attempt + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Job polling timeout - file may be too large or processing failed');
}

function processTranscriptResponse(data: any): string {
  // According to docs, when text=true, response has 'content' field
  let text = data.content || '';

  if (!text) {
    // Fallback to old format
    text = data.text || data.transcript || '';
    if (!text && typeof data.data === 'string') {
      text = data.data;
    }
  }

  if (!text) {
    throw new Error('SupaData returned no transcript text');
  }

  return text.trim();
}

export async function fetchTranscript(
  videoId: string,
  apiKey: string
): Promise<TranscriptResult> {
  try {
    // Construct YouTube URL from video ID
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Correct endpoint according to SupaData docs
    const url = 'https://api.supadata.ai/v1/transcript';

    console.log(`[SupaData] Requesting transcript for: ${youtubeUrl}`);

    const response = await axios.get(url, {
      params: {
        url: youtubeUrl,
        text: true,  // Return plain text instead of timestamped chunks
        mode: 'auto' // Try native first, fallback to AI generation
      },
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      timeout: 120000, // 120 seconds
    });

    console.log(`[SupaData] Response status: ${response.status}`);

    // Handle 202 - Async job
    if (response.status === 202) {
      const jobId = response.data.jobId;
      if (!jobId) {
        throw new Error('Got 202 but no job ID');
      }
      console.log(`[SupaData] Large file detected, polling job: ${jobId}`);
      const transcript = await pollJobResult(jobId, apiKey);
      return { transcript };
    }

    // Handle 200 - Direct response
    const transcript = processTranscriptResponse(response.data);
    return { transcript };

  } catch (error: any) {
    // Log full error for debugging
    console.error('[SupaData] Full error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });

    if (error.response?.status === 401) {
      console.error('SupaData: 401 Unauthorized - check API key');
      return { transcript: '', error: 'API_KEY_EXHAUSTED' };
    }

    if (error.response?.status === 429) {
      console.error('SupaData: 429 Rate limit - API key exhausted');
      return { transcript: '', error: 'API_KEY_EXHAUSTED' };
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('SupaData: Request timeout');
      return { transcript: '', error: 'Request timeout - video may be too long' };
    }

    if (error.code === 'ERR_NETWORK') {
      console.error('SupaData: Network error');
      return { transcript: '', error: 'Network error - check internet connection' };
    }

    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch transcript';
    console.error('Supadata API Error:', errorMessage);
    return {
      transcript: '',
      error: errorMessage,
    };
  }
}

// Test if API key is valid and has quota
export async function testSupadataApiKey(apiKey: string): Promise<boolean> {
  try {
    // Use a known public video to test
    const response = await axios.get(
      'https://api.supadata.ai/v1/transcript',
      {
        params: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Sample video
          text: true,
          mode: 'auto'
        },
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    return response.status === 200 || response.status === 202;
  } catch (error: any) {
    if (error.response?.status === 429 || error.response?.status === 401) {
      return false; // Exhausted or invalid
    }
    // Other errors might be temporary, so return true
    return true;
  }
}
