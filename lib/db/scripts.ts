import { supabase } from '../supabase/client';
import type { PythonScript } from '@/types';

// Get all Python scripts
export async function getAllScripts(): Promise<PythonScript[]> {
  const { data, error } = await supabase
    .from('python_scripts')
    .select('*')
    .order('order_index');

  if (error) {
    console.error('Error fetching scripts:', error);
    return [];
  }

  return data || [];
}

// Get default script (to run automatically)
export async function getDefaultScript(): Promise<PythonScript | null> {
  const { data, error } = await supabase
    .from('python_scripts')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error) {
    console.error('Error fetching default script:', error);
    return null;
  }

  return data;
}

// Add new Python script
export async function addScript(
  name: string,
  content: string,
  isDefault: boolean = false
): Promise<boolean> {
  // If setting as default, unset other defaults first
  if (isDefault) {
    await supabase
      .from('python_scripts')
      .update({ is_default: false })
      .eq('is_default', true);
  }

  // Get max order index
  const { data: existingScripts } = await supabase
    .from('python_scripts')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = (existingScripts?.[0]?.order_index || 0) + 1;

  const { error } = await supabase
    .from('python_scripts')
    .insert({
      name,
      content,
      is_default: isDefault,
      order_index: nextOrder,
    });

  if (error) {
    console.error('Error adding script:', error);
    return false;
  }

  return true;
}

// Update Python script
export async function updateScript(
  id: string,
  updates: Partial<PythonScript>
): Promise<boolean> {
  // If setting as default, unset other defaults first
  if (updates.is_default) {
    await supabase
      .from('python_scripts')
      .update({ is_default: false })
      .eq('is_default', true)
      .neq('id', id);
  }

  const { error } = await supabase
    .from('python_scripts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating script:', error);
    return false;
  }

  return true;
}

// Get script by ID
export async function getScriptById(id: string): Promise<PythonScript | null> {
  const { data, error } = await supabase
    .from('python_scripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching script by ID:', error);
    return null;
  }

  return data;
}

// Delete Python script
export async function deleteScript(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('python_scripts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting script:', error);
    return false;
  }

  return true;
}
