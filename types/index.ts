// Database Types
export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  videos_per_day: number;
  created_at: string;
}

export interface SourceChannel {
  id: string;
  user_id: string;
  channel_url: string;
  min_duration_seconds: number;
  reference_audio_url: string;
  created_at: string;
}

export interface SharedSettings {
  key: string;
  value: string;
  created_at: string;
}

export interface SupadataApiKey {
  id: string;
  api_key: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface PythonScript {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  channel_id: string;
  video_id: string;
  title: string;
  views: number;
  duration_seconds: number;
  fetched_at: string;
  created_at: string;
  thumbnail_url?: string;
}

export interface DailySchedule {
  id: string;
  user_id: string;
  video_id: string;
  scheduled_date: string;
  position: number;
  transcript?: string;
  transcript_chars?: number;
  processed_script?: string;
  processed_chars?: number;
  status: 'pending' | 'processing' | 'completed';
  created_at: string;
  video?: Video;
}

// API Response Types
export interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
  };
  statistics: {
    viewCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

export interface TranscriptResponse {
  transcript: string;
  language?: string;
}

export interface VastAIInstance {
  id: string;
  status: string;
  ssh_host?: string;
  ssh_port?: number;
}
