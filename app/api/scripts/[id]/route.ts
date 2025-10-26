import { NextRequest, NextResponse } from 'next/server';
import { updateScript, deleteScript } from '@/lib/db/scripts';

export const dynamic = 'force-dynamic';

// PUT /api/scripts/[id] - Update Python script
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    // Update in database
    const success = await updateScript(id, {
      name: file.name,
      content,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update script' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Script "${file.name}" updated successfully`,
    });
  } catch (error: any) {
    console.error('Error updating script:', error);
    return NextResponse.json(
      { error: 'Failed to update script' },
      { status: 500 }
    );
  }
}

// DELETE /api/scripts/[id] - Delete Python script
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const success = await deleteScript(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete script' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Script deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting script:', error);
    return NextResponse.json(
      { error: 'Failed to delete script' },
      { status: 500 }
    );
  }
}
