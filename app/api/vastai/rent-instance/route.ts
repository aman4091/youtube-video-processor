import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://cloud.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const { instanceType = 'RTX3090' } = await request.json();

    // Get VastAI API key from settings
    const apiKey = await getSharedSetting('vastai_api_key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'VastAI API key not configured' },
        { status: 500 }
      );
    }

    // Search for available offers
    const searchResponse = await axios.get(`${VASTAI_API_URL}/bundles`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      params: {
        gpu_name: instanceType,
        order: 'dph_total',
        limit: 1,
      },
    });

    if (!searchResponse.data?.offers?.[0]) {
      return NextResponse.json(
        { error: 'No available instances found' },
        { status: 404 }
      );
    }

    const offer = searchResponse.data.offers[0];

    // Rent the instance
    const rentResponse = await axios.post(
      `${VASTAI_API_URL}/asks/${offer.id}/`,
      {
        image: 'pytorch/pytorch:latest',
        disk: 10,
        onstart: '',
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({
      id: rentResponse.data.new_contract,
      status: 'renting',
    });
  } catch (error: any) {
    console.error('VastAI Rent Error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.error || 'Failed to rent GPU instance' },
      { status: 500 }
    );
  }
}
