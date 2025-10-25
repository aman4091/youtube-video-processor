import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://console.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, tail = 100 } = await request.json();

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
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

    // Request logs from VastAI
    const response = await axios.put(
      `${VASTAI_API_URL}/instances/request_logs/${instanceId}`,
      {
        tail: tail.toString()
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('VastAI logs response:', { status: response.status, dataLength: response.data?.length });

    return NextResponse.json({
      success: true,
      logs: response.data || '',
    });
  } catch (error: any) {
    console.error('VastAI Logs Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return NextResponse.json(
      { error: error.response?.data?.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
