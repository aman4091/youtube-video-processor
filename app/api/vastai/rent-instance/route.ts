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

    // Search for available offers with API filters
    // Note: VastAI API has limited operators (eq, gte, lte, gt, lt)
    // GPU name filtering must be done client-side
    const searchResponse = await axios.get(`${VASTAI_API_URL}/bundles`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      params: {
        q: JSON.stringify({
          verified: { eq: true },
          rentable: { eq: true },
          num_gpus: { eq: 1 },  // Only single GPU instances
          gpu_ram: { gte: minVram },  // Minimum VRAM requirement
        })
      }
    });

    console.log('VastAI: Search response received', {
      offersCount: searchResponse.data?.offers?.length || 0,
      responseType: typeof searchResponse.data,
      apiFilters: `${instanceType}, ${minVram}GB+ VRAM, 1x GPU only`,
      clientFilter: region === 'US' ? 'North America (US/CA)' : region
    });

    let allOffers = searchResponse.data?.offers || [];

    // Debug: Log first 3 offers with ALL fields to see structure
    if (allOffers.length > 0) {
      console.log('VastAI: Sample offer (FULL DATA):', JSON.stringify(allOffers[0], null, 2));
      console.log('VastAI: First 5 offers summary:', allOffers.slice(0, 5).map((o: any) => ({
        gpu: o.gpu_name,
        num_gpus: o.num_gpus,
        gpu_count: o.gpu_count,
        vram: o.gpu_ram,
        location: o.geolocation,
        price: o.dph_total
      })));
    }

    if (allOffers.length === 0) {
      console.error('VastAI: No offers returned from API');
      return NextResponse.json(
        { error: 'No GPU instances available on VastAI currently. Please try again later.' },
        { status: 404 }
      );
    }

    // Filter offers by GPU type, VRAM, and single GPU only
    // Region filter removed to allow worldwide RTX 4090 instances
    const offers = allOffers
      .filter((offer: any) => {
        const matchesGPU = offer.gpu_name?.includes(instanceType);
        const hasEnoughVRAM = (offer.gpu_ram || 0) >= minVram;
        const isSingleGPU = (offer.num_gpus === 1) || (offer.gpu_count === 1);

        console.log('VastAI: Checking offer', {
          gpu: offer.gpu_name,
          matchesGPU,
          hasEnoughVRAM,
          isSingleGPU,
          num_gpus: offer.num_gpus,
          vram: offer.gpu_ram,
          location: offer.geolocation
        });

        return matchesGPU && hasEnoughVRAM && isSingleGPU;
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
      gpuCount: offer.num_gpus || offer.gpu_count,
      vram: offer.gpu_ram,
      location: offer.geolocation
    });

    // Rent the instance using PUT method with VastAI's official PyTorch image
    const rentResponse = await axios.put(
      `${VASTAI_API_URL}/asks/${offer.id}/`,
      {
        client_id: 'me',
        image: 'vastai/pytorch_cuda-12.6.3-auto',  // VastAI's official pre-built PyTorch image
        disk: 60, // 60GB storage requirement
        label: 'youtube-processor',
        runtype: 'ssh',
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
