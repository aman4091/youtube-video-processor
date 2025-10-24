import { NextRequest, NextResponse } from 'next/server';
import { getUserSettings } from '@/lib/db/users';
import { getUserVideos, createDailySchedule, scheduleExistsForDate } from '@/lib/db/videos';
import { shuffleArray, getTodayDate } from '@/lib/utils/helpers';

export async function POST(request: NextRequest) {
  try {
    const { userId, date } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const scheduleDate = date || getTodayDate();

    // Check if schedule already exists for this date
    const exists = await scheduleExistsForDate(userId, scheduleDate);
    if (exists) {
      return NextResponse.json(
        { error: 'Schedule already exists for this date' },
        { status: 400 }
      );
    }

    // Get user settings
    const userSettings = await getUserSettings(userId);
    const videosPerDay = userSettings?.videos_per_day || 16;

    // Get all available videos for user
    const allVideos = await getUserVideos(userId);

    if (allVideos.length === 0) {
      return NextResponse.json(
        { error: 'No videos available. Please fetch videos first.' },
        { status: 400 }
      );
    }

    // Randomly select videos
    const shuffled = shuffleArray(allVideos);
    const selectedVideos = shuffled.slice(0, Math.min(videosPerDay, shuffled.length));

    // Create schedule
    const videoIds = selectedVideos.map((v) => v.id);
    const success = await createDailySchedule(userId, videoIds, scheduleDate);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to create schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videosScheduled: selectedVideos.length,
      date: scheduleDate,
    });
  } catch (error: any) {
    console.error('Error in generate schedule API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
