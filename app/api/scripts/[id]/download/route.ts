import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// GET /api/scripts/[id]/download - Download Python script
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: script, error } = await supabase
      .from('python_scripts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // Return file as downloadable
    return new NextResponse(script.content, {
      headers: {
        'Content-Type': 'text/x-python',
        'Content-Disposition': `attachment; filename="${script.name}"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading script:', error);
    return NextResponse.json(
      { error: 'Failed to download script' },
      { status: 500 }
    );
  }
}
