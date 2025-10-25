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

    // Search for available offers using the correct endpoint
    // VastAI API v0 bundles endpoint
    const searchResponse = await axios.get(`${VASTAI_API_URL}/bundles/`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    console.log('VastAI: Search response received', {
      offersCount: searchResponse.data?.offers?.length || 0,
      responseType: typeof searchResponse.data
    });

    let allOffers = searchResponse.data?.offers || [];

    if (allOffers.length === 0) {
      console.error('VastAI: No offers returned from API');
      return NextResponse.json(
        { error: 'No GPU instances available on VastAI currently. Please try again later.' },
        { status: 404 }
      );
    }

    // Filter offers by GPU type and rentability
    const offers = allOffers
      .filter((offer: any) =>
        offer.gpu_name?.includes(instanceType) &&
        offer.rentable === true &&
        offer.verified === true
      )
      .sort((a: any, b: any) => a.dph_total - b.dph_total); // Sort by price ascending

    console.log('VastAI: Filtered offers', {
      totalOffers: allOffers.length,
      filteredCount: offers.length,
      requestedGPU: instanceType
    });

    if (offers.length === 0) {
      console.error('VastAI: No matching instances found for', instanceType);
      return NextResponse.json(
        { error: `No available ${instanceType} instances found. Try a different GPU type (RTX3090, RTX4090, A100, etc.)` },
        { status: 404 }
      );
    }

    const offer = offers[0];
    console.log('VastAI: Found offer', { offerId: offer.id, price: offer.dph_total });

    // Rent the instance using PUT method
    const rentResponse = await axios.put(
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
