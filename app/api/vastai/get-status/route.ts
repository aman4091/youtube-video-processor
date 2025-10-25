import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://console.vast.ai/api/v0';

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

    // VastAI API returns data nested in 'instances' object
    const instanceData = response.data.instances || response.data;

    console.log('VastAI: Status response:', {
      id: instanceData.id,
      status: instanceData.actual_status,
      has_ssh: !!instanceData.ssh_host,
      ssh_host: instanceData.ssh_host,
      ssh_port: instanceData.ssh_port
    });

    return NextResponse.json({
      id: instanceData.id,
      status: instanceData.actual_status,
      ssh_host: instanceData.ssh_host,
      ssh_port: instanceData.ssh_port,
      public_ipaddr: instanceData.public_ipaddr,
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
