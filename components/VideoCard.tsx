import { formatDuration, formatViews } from '@/lib/utils/helpers';
import type { DailySchedule } from '@/types';
import { CheckCircle2, Clock, PlayCircle } from 'lucide-react';

interface VideoCardProps {
  schedule: DailySchedule;
}

export default function VideoCard({ schedule }: VideoCardProps) {
  const video = schedule.video;

  if (!video) return null;

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      label: 'Pending',
    },
    processing: {
      icon: PlayCircle,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      label: 'Processing',
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      label: 'Completed',
    },
  };

  const status = statusConfig[schedule.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 group">
      {/* Thumbnail */}
      {video.thumbnail_url && (
        <div className="relative aspect-video bg-slate-900 overflow-hidden">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
            {formatDuration(video.duration_seconds)}
          </div>
          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-indigo-400 text-xs px-2 py-1 rounded-md font-medium">
            #{schedule.position + 1}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white line-clamp-2 mb-3 leading-snug">
          {video.title}
        </h3>

        <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{formatViews(video.views)}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-2 ${status.bgColor} ${status.borderColor} border ${status.color} px-3 py-2 rounded-lg`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">{status.label}</span>
        </div>

        {/* Progress Info */}
        {schedule.transcript_chars && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Transcript: {schedule.transcript_chars.toLocaleString()} chars</span>
            </div>
          </div>
        )}

        {schedule.processed_chars && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Processed: {schedule.processed_chars.toLocaleString()} chars</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
