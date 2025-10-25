import axios from 'axios';

const VASTAI_API_URL = 'https://cloud.vast.ai/api/v0';

export interface VastAIInstance {
  id: number;
  status: string;
  ssh_host?: string;
  ssh_port?: number;
  public_ipaddr?: string;
}

// Rent a GPU instance
export async function rentGPUInstance(
  apiKey: string,
  instanceType: string = 'RTX3090'
): Promise<VastAIInstance> {
  try {
    // Search for available offers
    const searchResponse = await axios.get(`${VASTAI_API_URL}/bundles`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      params: {
        gpu_name: instanceType,
        order: 'dph_total',
        limit: 1,
      },
    });

    if (!searchResponse.data?.offers?.[0]) {
      throw new Error('No available instances found');
    }

    const offer = searchResponse.data.offers[0];

    // Rent the instance
    const rentResponse = await axios.post(
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

    return {
      id: rentResponse.data.new_contract,
      status: 'renting',
    };
  } catch (error: any) {
    console.error('VastAI Rent Error:', error.response?.data || error.message);
    throw new Error('Failed to rent GPU instance');
  }
}

// Get instance status
export async function getInstanceStatus(
  apiKey: string,
  instanceId: number
): Promise<VastAIInstance> {
  try {
    const response = await axios.get(
      `${VASTAI_API_URL}/instances/${instanceId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    return {
      id: response.data.id,
      status: response.data.actual_status,
      ssh_host: response.data.ssh_host,
      ssh_port: response.data.ssh_port,
      public_ipaddr: response.data.public_ipaddr,
    };
  } catch (error: any) {
    console.error('VastAI Status Error:', error.response?.data || error.message);
    throw new Error('Failed to get instance status');
  }
}

// Execute command on instance
export async function executeCommand(
  apiKey: string,
  instanceId: number,
  command: string
): Promise<{ output: string; success: boolean }> {
  try {
    const response = await axios.post(
      `${VASTAI_API_URL}/instances/${instanceId}/execute`,
      {
        command,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      output: response.data.output || '',
      success: true,
    };
  } catch (error: any) {
    console.error('VastAI Execute Error:', error.response?.data || error.message);
    return {
      output: error.response?.data?.message || 'Command execution failed',
      success: false,
    };
  }
}

// Stop instance
export async function stopInstance(
  apiKey: string,
  instanceId: number
): Promise<boolean> {
  try {
    await axios.delete(`${VASTAI_API_URL}/instances/${instanceId}/`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    return true;
  } catch (error: any) {
    console.error('VastAI Stop Error:', error.response?.data || error.message);
    throw new Error('Failed to stop instance');
  }
}

// Execute multiple commands sequentially
export async function executeCommands(
  apiKey: string,
  instanceId: number,
  commands: string[]
): Promise<Array<{ command: string; output: string; success: boolean }>> {
  const results: Array<{ command: string; output: string; success: boolean }> = [];

  for (const command of commands) {
    const result = await executeCommand(apiKey, instanceId, command);
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

// List all instances
export async function listInstances(apiKey: string): Promise<VastAIInstance[]> {
  try {
    const response = await axios.get(`${VASTAI_API_URL}/instances/`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    return response.data.instances || [];
  } catch (error: any) {
    console.error('VastAI list instances error:', error.response?.data || error.message);
    throw new Error('Failed to list instances');
  }
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
