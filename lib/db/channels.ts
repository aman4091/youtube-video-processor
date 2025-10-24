import { supabase } from '../supabase/client';
import type { SourceChannel } from '@/types';

// Get user's source channels
export async function getUserChannels(userId: string): Promise<SourceChannel[]> {
  const { data, error } = await supabase
    .from('source_channels')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  if (error) {
    console.error('Error fetching channels:', error);
    return [];
  }

  return data || [];
}

// Add new source channel
export async function addSourceChannel(
  userId: string,
  channelUrl: string,
  minDurationSeconds: number,
  referenceAudioUrl: string
): Promise<SourceChannel | null> {
  const { data, error } = await supabase
    .from('source_channels')
    .insert({
      user_id: userId,
      channel_url: channelUrl,
      min_duration_seconds: minDurationSeconds,
      reference_audio_url: referenceAudioUrl,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding channel:', error);
    return null;
  }

  return data;
}

// Update source channel
export async function updateSourceChannel(
  channelId: string,
  updates: Partial<SourceChannel>
): Promise<boolean> {
  const { error } = await supabase
    .from('source_channels')
    .update(updates)
    .eq('id', channelId);

  if (error) {
    console.error('Error updating channel:', error);
    return false;
  }

  return true;
}

// Delete source channel
export async function deleteSourceChannel(channelId: string): Promise<boolean> {
  const { error } = await supabase
    .from('source_channels')
    .delete()
    .eq('id', channelId);

  if (error) {
    console.error('Error deleting channel:', error);
    return false;
  }

  return true;
}
