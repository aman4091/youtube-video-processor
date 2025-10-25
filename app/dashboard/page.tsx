'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getWeekSchedule } from '@/lib/db/videos';
import { getUserSettings } from '@/lib/db/users';
import VideoCard from '@/components/VideoCard';
import ProcessModal from '@/components/modals/ProcessModal';
import VastAIModal from '@/components/modals/VastAIModal';
import { formatDate, getTodayDate } from '@/lib/utils/helpers';
import { RefreshCw, PlayCircle, Server, Sparkles, Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DailySchedule, UserSettings } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [weekSchedule, setWeekSchedule] = useState<{ [date: string]: DailySchedule[] }>({});
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [vastAIModalOpen, setVastAIModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingVideos, setFetchingVideos] = useState(false);

  // Generate next 7 days
  const getNext7Days = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const fetchSchedule = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      const [scheduleData, settingsData] = await Promise.all([
        getWeekSchedule(user.id),
        getUserSettings(user.id),
      ]);

      setWeekSchedule(scheduleData);
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

  const handleFetchVideos = async () => {
    if (!user) return;

    setFetchingVideos(true);
    const loadingToast = toast.loading('Fetching videos from YouTube...');

    try {
      const response = await fetch('/api/videos/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch videos');
      }

      const successCount = data.results.filter((r: any) => r.success).length;
      const totalVideos = data.results.reduce((sum: number, r: any) => sum + (r.videosCount || 0), 0);

      toast.success(`Videos fetched! ${successCount} channels, ${totalVideos} videos`, {
        id: loadingToast,
      });
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setFetchingVideos(false);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!user) return;

    const loadingToast = toast.loading('Generating schedules for next 7 days...');

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

      toast.success(`Schedules generated! ${data.daysScheduled} days, ${data.videosScheduled} videos`, {
        id: loadingToast,
      });
      fetchSchedule();
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-indigo-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-xl"></div>
          </div>
          <p className="mt-6 text-gray-400 font-medium">Loading schedule...</p>
        </div>
      </div>
    );
  }

  const next7Days = getNext7Days();
  const schedule = weekSchedule[selectedDate] || [];
  const completedCount = schedule.filter((s) => s.status === 'completed').length;
  const totalCount = schedule.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Get day name from date
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date(getTodayDate());
    if (dateStr === getTodayDate()) return 'Today';
    if (dateStr === new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0]) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Navigate dates
  const goToPreviousDate = () => {
    const currentIndex = next7Days.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(next7Days[currentIndex - 1]);
    }
  };

  const goToNextDate = () => {
    const currentIndex = next7Days.indexOf(selectedDate);
    if (currentIndex < next7Days.length - 1) {
      setSelectedDate(next7Days[currentIndex + 1]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent mb-2">
                7 Days Schedule
              </h1>
              <p className="text-gray-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(selectedDate)} • {user?.username}
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 text-gray-300 rounded-xl hover:bg-slate-700/50 transition-all disabled:opacity-50 backdrop-blur-sm"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Date Navigation */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={goToPreviousDate}
              disabled={next7Days.indexOf(selectedDate) === 0}
              className="p-2 bg-slate-800/50 border border-slate-700/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2">
                {next7Days.map((date) => {
                  const dateObj = new Date(date);
                  const isSelected = date === selectedDate;
                  const isToday = date === getTodayDate();
                  const daySchedule = weekSchedule[date] || [];
                  const dayCompleted = daySchedule.filter(s => s.status === 'completed').length;
                  const dayTotal = daySchedule.length;

                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 min-w-[120px] px-4 py-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                          : 'bg-slate-800/30 border-slate-700/30 text-gray-300 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">
                            {getDayName(date)}
                          </p>
                          {isToday && (
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                        <p className={`text-xs ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        {dayTotal > 0 && (
                          <p className={`text-xs mt-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                            {dayCompleted}/{dayTotal} done
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={goToNextDate}
              disabled={next7Days.indexOf(selectedDate) === next7Days.length - 1}
              className="p-2 bg-slate-800/50 border border-slate-700/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-1">Total Videos</p>
                  <p className="text-3xl font-bold text-white">{totalCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-1">Completed</p>
                  <p className="text-3xl font-bold text-white">{completedCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-green-400" />
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-1">Per Day Setting</p>
                  <p className="text-3xl font-bold text-white">{userSettings?.videos_per_day || 16}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center">
                  <Server className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* No Schedule */}
        {schedule.length === 0 && (
          <div className="text-center py-20 bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-2xl">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl mb-6">
              <Calendar className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              No schedule for {getDayName(selectedDate)}
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              First fetch videos from your channels, then generate schedules for the next 7 days
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleFetchVideos}
                disabled={fetchingVideos}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className={`h-5 w-5 ${fetchingVideos ? 'animate-bounce' : ''}`} />
                {fetchingVideos ? 'Fetching...' : 'Fetch Videos'}
              </button>
              <button
                onClick={handleGenerateSchedule}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:scale-105"
              >
                Generate Schedule
              </button>
            </div>
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
            <div className="flex gap-4 justify-center sticky bottom-8 z-10">
              <button
                onClick={() => setProcessModalOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all transform hover:scale-105 backdrop-blur-sm"
              >
                <PlayCircle className="h-5 w-5" />
                Process Transcripts
              </button>

              <button
                onClick={() => setVastAIModalOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transition-all transform hover:scale-105 backdrop-blur-sm"
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
    </div>
  );
}
