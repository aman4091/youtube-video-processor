import { supabase } from '../supabase/client';
import type { SharedSettings, SupadataApiKey } from '@/types';

// Get shared setting by key
export async function getSharedSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('shared_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error('Error fetching setting:', error);
    return null;
  }

  return data?.value || null;
}

// Get all shared settings
export async function getAllSharedSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('shared_settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settings: Record<string, string> = {};
  data?.forEach((item) => {
    settings[item.key] = item.value;
  });

  return settings;
}

// Update shared setting
export async function updateSharedSetting(
  key: string,
  value: string
): Promise<boolean> {
  const { error } = await supabase
    .from('shared_settings')
    .upsert({ key, value });

  if (error) {
    console.error('Error updating setting:', error);
    return false;
  }

  return true;
}

// Get active Supadata API keys
export async function getActiveSupadataKeys(): Promise<SupadataApiKey[]> {
  const { data, error } = await supabase
    .from('supadata_api_keys')
    .select('*')
    .eq('is_active', true)
    .order('priority');

  if (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }

  return data || [];
}

// Add Supadata API key
export async function addSupadataApiKey(apiKey: string): Promise<boolean> {
  // Get current max priority
  const { data: existingKeys } = await supabase
    .from('supadata_api_keys')
    .select('priority')
    .order('priority', { ascending: false })
    .limit(1);

  const nextPriority = (existingKeys?.[0]?.priority || 0) + 1;

  const { error } = await supabase
    .from('supadata_api_keys')
    .insert({
      api_key: apiKey,
      is_active: true,
      priority: nextPriority,
    });

  if (error) {
    console.error('Error adding API key:', error);
    return false;
  }

  return true;
}

// Delete Supadata API key
export async function deleteSupadataApiKey(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('supadata_api_keys')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting API key:', error);
    return false;
  }

  return true;
}

// Mark API key as exhausted (inactive)
export async function markApiKeyExhausted(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('supadata_api_keys')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error marking API key exhausted:', error);
    return false;
  }

  return true;
}

// Get next available Supadata API key
export async function getNextSupadataApiKey(): Promise<SupadataApiKey | null> {
  const keys = await getActiveSupadataKeys();
  return keys[0] || null;
}
