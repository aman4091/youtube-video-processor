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
      console.error('VastAI API key not found in settings');
      return NextResponse.json(
        { error: 'VastAI API key not configured in Settings. Please add it first.' },
        { status: 400 }
      );
    }

    console.log('VastAI: Starting instance rental process...', { instanceType });

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

    console.log('VastAI: Search response received', {
      offersCount: searchResponse.data?.offers?.length || 0
    });

    if (!searchResponse.data?.offers?.[0]) {
      console.error('VastAI: No available instances found for', instanceType);
      return NextResponse.json(
        { error: `No available ${instanceType} instances found. Try again later or contact VastAI support.` },
        { status: 404 }
      );
    }

    const offer = searchResponse.data.offers[0];
    console.log('VastAI: Found offer', { offerId: offer.id, price: offer.dph_total });

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

    console.log('VastAI: Instance rented successfully', {
      contractId: rentResponse.data.new_contract
    });

    return NextResponse.json({
      id: rentResponse.data.new_contract,
      status: 'renting',
    });
  } catch (error: any) {
    console.error('VastAI Rent Error Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
      }
    });

    return NextResponse.json(
      {
        error: error.response?.data?.error || error.message || 'Failed to rent GPU instance',
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}
