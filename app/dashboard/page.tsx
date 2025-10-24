'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTodaySchedule } from '@/lib/db/videos';
import { getUserSettings } from '@/lib/db/users';
import VideoCard from '@/components/VideoCard';
import ProcessModal from '@/components/modals/ProcessModal';
import VastAIModal from '@/components/modals/VastAIModal';
import { formatDate, getTodayDate } from '@/lib/utils/helpers';
import { RefreshCw, PlayCircle, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DailySchedule, UserSettings } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<DailySchedule[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [vastAIModalOpen, setVastAIModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      const [scheduleData, settingsData] = await Promise.all([
        getTodaySchedule(user.id),
        getUserSettings(user.id),
      ]);

      setSchedule(scheduleData);
      setUserSettings(settingsData);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [user]);

  const handleRefresh = () => {
    fetchSchedule();
    toast.success('Schedule refreshed');
  };

  const handleGenerateSchedule = async () => {
    if (!user) return;

    const loadingToast = toast.loading('Generating schedule...');

    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate schedule');
      }

      toast.success(`Schedule generated! ${data.videosScheduled} videos scheduled`, {
        id: loadingToast,
      });
      fetchSchedule();
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  const todayDate = getTodayDate();
  const completedCount = schedule.filter((s) => s.status === 'completed').length;
  const totalCount = schedule.length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Today's Schedule
            </h1>
            <p className="text-gray-600">
              {formatDate(todayDate)} • {user?.username}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Total Videos:</span>
            <span className="text-indigo-600 font-semibold">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Completed:</span>
            <span className="text-green-600 font-semibold">{completedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Per Day Setting:</span>
            <span className="text-gray-600">{userSettings?.videos_per_day || 16}</span>
          </div>
        </div>
      </div>

      {/* No Schedule */}
      {schedule.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg shadow-md">
          <div className="text-gray-400 mb-4">
            <PlayCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No schedule for today
          </h3>
          <p className="text-gray-600 mb-6">
            Generate a new schedule to get started
          </p>
          <button
            onClick={handleGenerateSchedule}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
          >
            Generate Schedule
          </button>
        </div>
      )}

      {/* Video Grid */}
      {schedule.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {schedule.map((item) => (
              <VideoCard key={item.id} schedule={item} />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center sticky bottom-4 z-10">
            <button
              onClick={() => setProcessModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all"
            >
              <PlayCircle className="h-5 w-5" />
              Process Transcripts
            </button>

            <button
              onClick={() => setVastAIModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-all"
            >
              <Server className="h-5 w-5" />
              VastAI
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      <ProcessModal
        isOpen={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        schedule={schedule}
        onUpdate={fetchSchedule}
      />

      <VastAIModal
        isOpen={vastAIModalOpen}
        onClose={() => setVastAIModalOpen(false)}
        schedule={schedule}
      />
    </div>
  );
}
