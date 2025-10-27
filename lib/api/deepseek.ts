import axios from 'axios';

export interface DeepSeekResult {
  processedText: string;
  error?: string;
}

/**
 * Split transcript into chunks at nearest sentence boundary around targetSize
 */
function splitIntoChunks(text: string, targetSize: number = 7000): string[] {
  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= targetSize) {
      chunks.push(remainingText.trim());
      break;
    }

    // Find the last sentence ending near targetSize
    const searchText = remainingText.substring(0, targetSize + 500); // Search a bit beyond target
    const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

    let splitIndex = -1;
    for (const ending of sentenceEndings) {
      const index = searchText.lastIndexOf(ending);
      if (index > targetSize - 500 && index !== -1) {
        splitIndex = Math.max(splitIndex, index + ending.length);
      }
    }

    // If no sentence boundary found, split at targetSize
    if (splitIndex === -1) {
      splitIndex = targetSize;
    }

    chunks.push(remainingText.substring(0, splitIndex).trim());
    remainingText = remainingText.substring(splitIndex).trim();
  }

  return chunks;
}

/**
 * Process a single chunk with DeepSeek API
 */
async function processChunk(
  chunk: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: chunk,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 300 seconds (5 minutes)
      }
    );

    const processedText = response.data.choices?.[0]?.message?.content;

    if (!processedText) {
      throw new Error('No response from DeepSeek API');
    }

    return processedText.trim();
  } catch (error: any) {
    console.error('[DeepSeek] Chunk processing error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code
    });

    if (error.response?.status === 401) {
      throw new Error('Invalid DeepSeek API key');
    }

    if (error.response?.status === 429) {
      throw new Error('DeepSeek API rate limit exceeded');
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('DeepSeek API timeout - chunk too large, try smaller chunk size');
    }

    throw new Error(error.response?.data?.error?.message || error.message || 'DeepSeek API error');
  }
}

/**
 * Process entire transcript in parallel chunks
 */
export async function processTranscriptInChunks(
  transcript: string,
  prompt: string,
  apiKey: string,
  onProgress?: (current: number, total: number) => void
): Promise<DeepSeekResult> {
  try {
    if (!transcript || !transcript.trim()) {
      return { processedText: '', error: 'No transcript to process' };
    }

    if (!apiKey || !apiKey.trim()) {
      return { processedText: '', error: 'DeepSeek API key not configured' };
    }

    if (!prompt || !prompt.trim()) {
      return { processedText: '', error: 'No prompt template configured' };
    }

    console.log('[DeepSeek] Starting transcript processing...');
    console.log('[DeepSeek] Transcript length:', transcript.length);

    // Split into chunks
    const chunks = splitIntoChunks(transcript, 7000);
    console.log('[DeepSeek] Split into', chunks.length, 'chunks');

    if (onProgress) {
      onProgress(0, chunks.length);
    }

    // Process all chunks in parallel
    const processedChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        console.log(`[DeepSeek] Processing chunk ${index + 1}/${chunks.length}`);
        const result = await processChunk(chunk, prompt, apiKey);

        if (onProgress) {
          onProgress(index + 1, chunks.length);
        }

        return result;
      })
    );

    // Merge results
    const processedText = processedChunks.join('\n\n');
    console.log('[DeepSeek] Processing complete. Output length:', processedText.length);

    return { processedText };
  } catch (error: any) {
    console.error('[DeepSeek] Processing error:', error);
    return {
      processedText: '',
      error: error.message || 'Failed to process transcript',
    };
  }
}

/**
 * Test if DeepSeek API key is valid
 */
export async function testDeepSeekApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
        max_tokens: 10,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return response.status === 200;
  } catch (error: any) {
    console.error('[DeepSeek] API key test failed:', error.message);
    return false;
  }
}
