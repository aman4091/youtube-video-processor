import axios from 'axios';

export interface VastAIInstance {
  id: number;
  status: string;
  ssh_host?: string;
  ssh_port?: number;
  public_ipaddr?: string;
}

// Rent a GPU instance
export async function rentGPUInstance(
  instanceType: string = 'RTX 4090',
  minVram: number = 20,
  region: string = 'US'
): Promise<VastAIInstance & { alternativeOffers?: any[] }> {
  try {
    const response = await axios.post('/api/vastai/rent-instance', {
      instanceType,
      minVram,
      region
    });

    return response.data;
  } catch (error: any) {
    console.error('VastAI Rent Error:', {
      status: error.response?.status,
      error: error.response?.data,
      message: error.message
    });

    const errorMessage = error.response?.data?.error || error.message || 'Failed to rent GPU instance';
    throw new Error(errorMessage);
  }
}

// Get instance status
export async function getInstanceStatus(
  instanceId: number
): Promise<VastAIInstance> {
  try {
    const response = await axios.post('/api/vastai/get-status', {
      instanceId,
    });

    return response.data;
  } catch (error: any) {
    console.error('VastAI Status Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to get instance status');
  }
}

// Execute command on instance
export async function executeCommand(
  instanceId: number,
  command: string
): Promise<{ output: string; success: boolean }> {
  try {
    const response = await axios.post('/api/vastai/execute-command', {
      instanceId,
      command,
    });

    return response.data;
  } catch (error: any) {
    console.error('VastAI Execute Error:', error.response?.data || error.message);
    return {
      output: error.response?.data?.output || 'Command execution failed',
      success: false,
    };
  }
}

// Stop instance
export async function stopInstance(
  instanceId: number
): Promise<boolean> {
  try {
    await axios.post('/api/vastai/stop-instance', {
      instanceId,
    });

    return true;
  } catch (error: any) {
    console.error('VastAI Stop Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to stop instance');
  }
}

// Execute multiple commands sequentially
export async function executeCommands(
  instanceId: number,
  commands: string[]
): Promise<Array<{ command: string; output: string; success: boolean }>> {
  const results: Array<{ command: string; output: string; success: boolean }> = [];

  for (const command of commands) {
    const result = await executeCommand(instanceId, command);
    results.push({
      command,
      output: result.output,
      success: result.success,
    });

    // Stop if any command fails
    if (!result.success) {
      break;
    }
  }

  return results;
}

// Upload script to instance (via our API proxy)
export async function uploadScriptToInstance(
  instanceId: number,
  scriptName: string,
  scriptContent: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const response = await axios.post('/api/vastai/upload-script', {
      instanceId,
      scriptName,
      scriptContent,
    });

    return {
      success: true,
      output: response.data.message,
    };
  } catch (error: any) {
    console.error('Script upload error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to upload script',
    };
  }
}

// Execute script on instance (via our API proxy)
export async function executeScriptOnInstance(
  instanceId: number,
  scriptName: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const response = await axios.post('/api/vastai/execute-script', {
      instanceId,
      scriptName,
    });

    return {
      success: true,
      output: response.data.output,
    };
  } catch (error: any) {
    console.error('Script execution error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to execute script',
    };
  }
}
