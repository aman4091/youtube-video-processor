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
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      label: 'Pending',
    },
    processing: {
      icon: PlayCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      label: 'Processing',
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      label: 'Completed',
    },
  };

  const status = statusConfig[schedule.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      {video.thumbnail_url && (
        <div className="relative aspect-video bg-gray-200">
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration_seconds)}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2">
          {video.title}
        </h3>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <span>{formatViews(video.views)} views</span>
          <span>#{schedule.position + 1}</span>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-2 ${status.bgColor} ${status.color} px-3 py-1.5 rounded-full w-fit`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{status.label}</span>
        </div>

        {/* Transcript Info */}
        {schedule.transcript_chars && (
          <div className="mt-3 text-xs text-gray-500">
            Transcript: {schedule.transcript_chars} chars
          </div>
        )}

        {/* Processed Script Info */}
        {schedule.processed_chars && (
          <div className="mt-1 text-xs text-gray-500">
            Processed: {schedule.processed_chars} chars
          </div>
        )}
      </div>
    </div>
  );
}
