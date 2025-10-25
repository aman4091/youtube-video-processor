import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://cloud.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, scriptName } = await request.json();

    if (!instanceId || !scriptName) {
      return NextResponse.json(
        { error: 'Instance ID and script name are required' },
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

    // Execute the Python script
    const command = `cd /workspace && python3 ${scriptName}`;

    console.log('Executing Python script:', { instanceId, scriptName, command });

    // Execute the command via VastAI API directly (same as execute-command route)
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

    // Log full response to debug output structure
    console.log('VastAI execute response status:', response.status);
    console.log('VastAI execute response data:', JSON.stringify(response.data, null, 2));

    return NextResponse.json({
      success: true,
      output: response.data.output || response.data.stdout || response.data || '',
      message: `Script ${scriptName} executed successfully`,
    });
  } catch (error: any) {
    console.error('Execute script error:', {
      message: error.message,
      data: error.response?.data,
      url: error.config?.url
    });
    return NextResponse.json(
      { error: error.response?.data?.message || error.message || 'Failed to execute script' },
      { status: 500 }
    );
  }
}
