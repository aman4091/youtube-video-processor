import { NextRequest, NextResponse } from 'next/server';
import { getAllScripts, addScript } from '@/lib/db/scripts';

// GET /api/scripts - Get all Python scripts
export async function GET() {
  try {
    const scripts = await getAllScripts();
    return NextResponse.json({ scripts });
  } catch (error: any) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scripts' },
      { status: 500 }
    );
  }
}

// POST /api/scripts - Upload new Python script
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.py')) {
      return NextResponse.json(
        { error: 'Only Python (.py) files are allowed' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Add to database
    const success = await addScript(file.name, content, false);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save script' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Script "${file.name}" uploaded successfully`,
    });
  } catch (error: any) {
    console.error('Error uploading script:', error);
    return NextResponse.json(
      { error: 'Failed to upload script' },
      { status: 500 }
    );
  }
}
