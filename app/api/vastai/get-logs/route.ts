import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://console.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, tail = 100, scriptName = 'k.py' } = await request.json();

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

    // Read logs from the script's log file using tail command
    const logFile = `/workspace/${scriptName}.log`;
    const command = `tail -n ${tail} ${logFile} 2>/dev/null || echo "Log file not found yet..."`;

    console.log('Reading logs from file:', { logFile, command });

    // Execute command to read log file
    const response = await axios.post(
      `${VASTAI_API_URL}/instances/command/${instanceId}/`,
      { command },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const logs = response.data?.output || '';
    console.log('Logs fetched:', logs.substring(0, 200));

    return NextResponse.json({
      success: true,
      logs: logs,
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
