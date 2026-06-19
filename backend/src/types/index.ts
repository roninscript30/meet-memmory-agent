// ============================================================
// Shared types for Meeting Scraper backend
// ============================================================

export type Platform = 'google_meet' | 'zoho_meeting';
export type MeetingStatus = 'active' | 'ended';

export type EventType =
  | 'participant_joined'
  | 'participant_left'
  | 'speaker_changed'
  | 'screen_share_started'
  | 'screen_share_stopped'
  | 'meeting_started'
  | 'meeting_ended';

// ---------- Request Bodies ----------

export interface CreateMeetingBody {
  meetingId: string;
  title: string;
  platform: Platform;
  url: string;
  startedAt: string;
}

export interface UpdateMeetingBody {
  endedAt?: string;
  title?: string;
  status?: MeetingStatus;
}

export interface CreateParticipantBody {
  name: string;
  joinedAt: string;
}

export interface UpdateParticipantBody {
  leftAt: string;
}

export interface CreateEventBody {
  type: EventType;
  participant?: string;
  speaker?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface BatchEventsBody {
  events: CreateEventBody[];
}

export interface CreateChatBody {
  sender: string;
  message: string;
  timestamp: string;
}

export interface BatchChatsBody {
  chats: CreateChatBody[];
}

// ---------- API Response ----------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}
