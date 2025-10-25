import { NextRequest, NextResponse } from 'next/server';
import { executeCommand } from '@/lib/api/vastai';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, scriptName } = await request.json();

    if (!instanceId || !scriptName) {
      return NextResponse.json(
        { error: 'Instance ID and script name are required' },
        { status: 400 }
      );
    }

    // Execute the Python script
    const command = `cd /workspace && python3 ${scriptName}`;

    // Execute the command via VastAI API
    const result = await executeCommand(instanceId, command);

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to execute script: ${result.output}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      output: result.output,
      message: `Script ${scriptName} executed successfully`,
    });
  } catch (error: any) {
    console.error('Execute script error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute script' },
      { status: 500 }
    );
  }
}
