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

    // Generate schedules for next 7 days
    const today = new Date();
    const schedulesCreated: string[] = [];
    let totalVideosScheduled = 0;

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const scheduleDate = targetDate.toISOString().split('T')[0];

      // Skip if schedule already exists
      const exists = await scheduleExistsForDate(userId, scheduleDate);
      if (exists) {
        console.log(`Schedule already exists for ${scheduleDate}, skipping`);
        continue;
      }

      // Randomly select videos for this day
      const shuffled = shuffleArray([...allVideos]); // Create new shuffled array each time
      const selectedVideos = shuffled.slice(0, Math.min(videosPerDay, shuffled.length));

      // Create schedule for this date
      const videoIds = selectedVideos.map((v) => v.id);
      const success = await createDailySchedule(userId, videoIds, scheduleDate);

      if (success) {
        schedulesCreated.push(scheduleDate);
        totalVideosScheduled += selectedVideos.length;
      }
    }

    if (schedulesCreated.length === 0) {
      return NextResponse.json(
        { error: 'All schedules for next 7 days already exist' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      daysScheduled: schedulesCreated.length,
      videosScheduled: totalVideosScheduled,
      dates: schedulesCreated,
    });
  } catch (error: any) {
    console.error('Error in generate schedule API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
