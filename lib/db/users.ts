import { supabase } from '../supabase/client';
import type { User, UserSettings } from '@/types';

// Get all users
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('username');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

// Create new user
export async function createUser(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({ username })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data;
}

// Get user settings
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }

  return data;
}

// Update user settings
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...settings });

  if (error) {
    console.error('Error updating user settings:', error);
    return false;
  }

  return true;
}
