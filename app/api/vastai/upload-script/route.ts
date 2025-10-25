import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://console.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, scriptName, scriptContent } = await request.json();

    if (!instanceId || !scriptName || !scriptContent) {
      return NextResponse.json(
        { error: 'Instance ID, script name, and content are required' },
        { status: 400 }
      );
    }

    // Get VastAI API key from settings
    const apiKey = await getSharedSetting('vastai_api_key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'VastAI API key not configured' },
        { status: 500 }
      );
    }

    // Create the Python script file using cat with heredoc
    // This avoids issues with special characters and multiline content
    const command = `cat > /workspace/${scriptName} << 'EOFSCRIPT'
${scriptContent}
EOFSCRIPT
chmod +x /workspace/${scriptName}`;

    // Execute the command via VastAI API directly
    const response = await axios.post(
      `${VASTAI_API_URL}/instances/${instanceId}/execute/`,
      { command },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Script ${scriptName} uploaded successfully`,
      output: response.data.output || '',
    });
  } catch (error: any) {
    console.error('Upload script error:', {
      message: error.message,
      data: error.response?.data,
      url: error.config?.url
    });
    return NextResponse.json(
      { error: error.response?.data?.message || error.message || 'Failed to upload script' },
      { status: 500 }
    );
  }
}
