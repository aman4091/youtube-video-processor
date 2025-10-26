import { NextRequest, NextResponse } from 'next/server';
import { getScriptById } from '@/lib/db/scripts';

export const dynamic = 'force-dynamic';

// GET /api/scripts/[id]/download - Download Python script
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const script = await getScriptById(id);

    if (!script) {
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
