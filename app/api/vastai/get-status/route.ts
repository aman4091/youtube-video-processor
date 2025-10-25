import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://cloud.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const { instanceId } = await request.json();

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

    console.log('VastAI: Checking status for instance:', instanceId);

    const response = await axios.get(
      `${VASTAI_API_URL}/instances/${instanceId}/`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    console.log('VastAI: Status response:', {
      id: response.data.id,
      status: response.data.actual_status,
      has_ssh: !!response.data.ssh_host
    });

    return NextResponse.json({
      id: response.data.id,
      status: response.data.actual_status,
      ssh_host: response.data.ssh_host,
      ssh_port: response.data.ssh_port,
      public_ipaddr: response.data.public_ipaddr,
    });
  } catch (error: any) {
    console.error('VastAI Status Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return NextResponse.json(
      { error: error.response?.data?.error || error.response?.data?.msg || 'Failed to get instance status' },
      { status: 500 }
    );
  }
}
