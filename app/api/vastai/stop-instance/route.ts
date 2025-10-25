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

    await axios.delete(`${VASTAI_API_URL}/instances/${instanceId}/`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Instance stopped successfully',
    });
  } catch (error: any) {
    console.error('VastAI Stop Error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.error || 'Failed to stop instance' },
      { status: 500 }
    );
  }
}
