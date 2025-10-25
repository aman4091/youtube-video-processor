import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getSharedSetting } from '@/lib/db/settings';

const VASTAI_API_URL = 'https://cloud.vast.ai/api/v0';

export async function POST(request: NextRequest) {
  try {
    const {
      instanceType = 'RTX 4090',
      minVram = 20,
      region = 'US'
    } = await request.json();

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

    // Search for available offers using the search endpoint (not bundles)
    const searchResponse = await axios.get(`${VASTAI_API_URL}/bundles`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      params: {
        q: `gpu_name=${instanceType}`,
      }
    });

    console.log('VastAI: Search response received', {
      offersCount: searchResponse.data?.offers?.length || 0,
      responseType: typeof searchResponse.data,
      queryUsed: `gpu_name=${instanceType}`
    });

    let allOffers = searchResponse.data?.offers || [];

    // Debug: Log first 5 offers to see what GPUs are available
    if (allOffers.length > 0) {
      console.log('VastAI: First 5 offers:', allOffers.slice(0, 5).map((o: any) => ({
        gpu: o.gpu_name,
        vram: o.gpu_ram,
        location: o.geolocation,
        rentable: o.rentable,
        verified: o.verified
      })));
    }

    if (allOffers.length === 0) {
      console.error('VastAI: No offers returned from API');
      return NextResponse.json(
        { error: 'No GPU instances available on VastAI currently. Please try again later.' },
        { status: 404 }
      );
    }

    // Filter offers by GPU type, VRAM, location, and rentability
    const offers = allOffers
      .filter((offer: any) => {
        const matchesGPU = offer.gpu_name?.includes(instanceType);
        const hasEnoughVRAM = (offer.gpu_ram || 0) >= minVram;
        const inRegion = region === 'US' ?
          (offer.geolocation?.includes('US') || offer.geolocation?.includes('CA')) :
          true;
        const isRentable = offer.rentable === true;
        const isVerified = offer.verified === true;

        // Debug each filter
        if (!matchesGPU || !hasEnoughVRAM || !inRegion) {
          console.log('VastAI: Offer filtered out', {
            gpu: offer.gpu_name,
            vram: offer.gpu_ram,
            location: offer.geolocation,
            matchesGPU,
            hasEnoughVRAM,
            inRegion,
            isRentable,
            isVerified
          });
        }

        return matchesGPU && hasEnoughVRAM && inRegion && isRentable && isVerified;
      })
      .sort((a: any, b: any) => a.dph_total - b.dph_total); // Sort by price ascending

    console.log('VastAI: Filtered offers', {
      totalOffers: allOffers.length,
      filteredCount: offers.length,
      requestedGPU: instanceType,
      minVRAM: minVram,
      region: region
    });

    if (offers.length === 0) {
      console.error('VastAI: No matching instances found', { instanceType, minVram, region });
      return NextResponse.json(
        { error: `No ${instanceType} instances found with ${minVram}GB+ VRAM in ${region === 'US' ? 'North America' : region}. Try different specs or try again later.` },
        { status: 404 }
      );
    }

    const offer = offers[0];
    console.log('VastAI: Found offer', {
      offerId: offer.id,
      price: offer.dph_total,
      gpu: offer.gpu_name,
      vram: offer.gpu_ram,
      location: offer.geolocation
    });

    // Rent the instance using PUT method with PyTorch template
    const rentResponse = await axios.put(
      `${VASTAI_API_URL}/asks/${offer.id}/`,
      {
        image: 'pytorch/pytorch:2.0.1-cuda11.8-cudnn8-runtime',
        disk: 60, // 60GB storage requirement
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
      alternativeOffers: offers.slice(1, 4).map((o: any) => ({
        id: o.id,
        gpu: o.gpu_name,
        vram: o.gpu_ram,
        price: o.dph_total,
        location: o.geolocation
      }))
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
