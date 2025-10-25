import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://console.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, command } = await request.json();

    if (!instanceId || !command) {
      return NextResponse.json(
        { error: 'Instance ID and command are required' },
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

    const response = await axios.post(
      `${VASTAI_API_URL}/instances/command/${instanceId}/`,
      {
        command,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({
      output: response.data.output || '',
      success: true,
    });
  } catch (error: any) {
    console.error('VastAI Execute Error:', {
      message: error.message,
      data: error.response?.data,
      url: error.config?.url
    });
    return NextResponse.json(
      {
        output: error.response?.data?.message || error.response?.data?.msg || 'Command execution failed',
        success: false,
      },
      { status: 500 }
    );
  }
}
