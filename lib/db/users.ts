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
export async function createUser(username: string, pin: string = '0000'): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({ username, pin })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data;
}

// Verify user PIN
export async function verifyUserPin(username: string, pin: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('pin', pin)
    .single();

  if (error) {
    console.error('Error verifying PIN:', error);
    return null;
  }

  return data;
}

// Update user PIN
export async function updateUserPin(userId: string, newPin: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ pin: newPin })
    .eq('id', userId);

  if (error) {
    console.error('Error updating PIN:', error);
    return false;
  }

  return true;
}

// Rename user
export async function renameUser(userId: string, newUsername: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ username: newUsername })
    .eq('id', userId);

  if (error) {
    console.error('Error renaming user:', error);
    return false;
  }

  return true;
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
