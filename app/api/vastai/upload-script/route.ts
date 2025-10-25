import { NextRequest, NextResponse } from 'next/server';
import { executeCommand } from '@/lib/api/vastai';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, scriptName, scriptContent } = await request.json();

    if (!instanceId || !scriptName || !scriptContent) {
      return NextResponse.json(
        { error: 'Instance ID, script name, and content are required' },
        { status: 400 }
      );
    }

    // Create the Python script file using cat with heredoc
    // This avoids issues with special characters and multiline content
    const command = `cat > /workspace/${scriptName} << 'EOFSCRIPT'
${scriptContent}
EOFSCRIPT
chmod +x /workspace/${scriptName}`;

    // Execute the command via VastAI API
    const result = await executeCommand(instanceId, command);

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to upload script: ${result.output}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Script ${scriptName} uploaded successfully`,
      output: result.output,
    });
  } catch (error: any) {
    console.error('Upload script error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload script' },
      { status: 500 }
    );
  }
}
