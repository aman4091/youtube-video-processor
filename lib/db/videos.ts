import { supabase } from '../supabase/client';
import type { Video, DailySchedule } from '@/types';
import { getTodayDate } from '../utils/helpers';

// Save videos to database
export async function saveVideos(
  channelId: string,
  videos: Partial<Video>[]
): Promise<boolean> {
  const videosToInsert = videos.map((v) => ({
    channel_id: channelId,
    ...v,
    fetched_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('videos')
    .upsert(videosToInsert, {
      onConflict: 'video_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error saving videos:', error);
    return false;
  }

  return true;
}

// Get videos for a channel
export async function getChannelVideos(channelId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('channel_id', channelId)
    .order('views', { ascending: false });

  if (error) {
    console.error('Error fetching videos:', error);
    return [];
  }

  return data || [];
}

// Get all videos for user's channels
export async function getUserVideos(userId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      source_channels!inner(user_id)
    `)
    .eq('source_channels.user_id', userId)
    .order('views', { ascending: false });

  if (error) {
    console.error('Error fetching user videos:', error);
    return [];
  }

  return data || [];
}

// Get today's schedule for user
export async function getTodaySchedule(userId: string): Promise<DailySchedule[]> {
  const today = getTodayDate();

  const { data, error} = await supabase
    .from('daily_schedule')
    .select(`
      *,
      video:videos(*)
    `)
    .eq('user_id', userId)
    .eq('scheduled_date', today)
    .order('position');

  if (error) {
    console.error('Error fetching schedule:', error);
    return [];
  }

  return data || [];
}

// Get schedule for date range (last 5 days + next 7 days = 12 days total)
export async function getWeekSchedule(userId: string): Promise<{ [date: string]: DailySchedule[] }> {
  const dates: string[] = [];
  const today = new Date();

  // Generate last 5 days + today + next 6 days (total 12 days)
  for (let i = -5; i <= 6; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  const { data, error } = await supabase
    .from('daily_schedule')
    .select(`
      *,
      video:videos(*)
    `)
    .eq('user_id', userId)
    .in('scheduled_date', dates)
    .order('position');

  if (error) {
    console.error('Error fetching week schedule:', error);
    return {};
  }

  // Group by date
  const scheduleByDate: { [date: string]: DailySchedule[] } = {};
  dates.forEach(date => {
    scheduleByDate[date] = (data || []).filter(item => item.scheduled_date === date);
  });

  return scheduleByDate;
}

// Get video IDs scheduled in last N days (for uniqueness check)
export async function getRecentlyScheduledVideoIds(
  userId: string,
  days: number = 15
): Promise<string[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_schedule')
    .select('video_id')
    .eq('user_id', userId)
    .gte('scheduled_date', startDateStr);

  if (error) {
    console.error('Error fetching recently scheduled videos:', error);
    return [];
  }

  // Return unique video IDs
  const videoIds = (data || []).map(item => item.video_id);
  return [...new Set(videoIds)];
}

// Create daily schedule
export async function createDailySchedule(
  userId: string,
  videoIds: string[],
  date?: string
): Promise<boolean> {
  const scheduleDate = date || getTodayDate();

  const scheduleItems = videoIds.map((videoId, index) => ({
    user_id: userId,
    video_id: videoId,
    scheduled_date: scheduleDate,
    position: index,
    status: 'pending' as const,
  }));

  const { error } = await supabase
    .from('daily_schedule')
    .insert(scheduleItems);

  if (error) {
    console.error('Error creating schedule:', error);
    return false;
  }

  return true;
}

// Update schedule item
export async function updateScheduleItem(
  scheduleId: string,
  updates: Partial<DailySchedule>
): Promise<boolean> {
  const { error } = await supabase
    .from('daily_schedule')
    .update(updates)
    .eq('id', scheduleId);

  if (error) {
    console.error('Error updating schedule item:', error);
    return false;
  }

  return true;
}

// Check if schedule exists for date
export async function scheduleExistsForDate(
  userId: string,
  date: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('daily_schedule')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('scheduled_date', date);

  if (error) {
    console.error('Error checking schedule:', error);
    return false;
  }

  return (count || 0) > 0;
}
