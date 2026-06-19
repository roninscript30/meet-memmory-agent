// ============================================================
// Shared types for Meet Scraper Extension
// ============================================================

export type Platform = 'google_meet' | 'zoho_meeting';

export type EventType =
  | 'participant_joined'
  | 'participant_left'
  | 'speaker_changed'
  | 'screen_share_started'
  | 'screen_share_stopped'
  | 'meeting_started'
  | 'meeting_ended';

// ---------- Meeting Data ----------

export interface MeetingMetadata {
  meetingId: string;
  title: string;
  platform: Platform;
  url: string;
  startedAt: string;
}

export interface ParticipantData {
  name: string;
  joinedAt: string;
  leftAt?: string;
}

export interface MeetingEvent {
  type: EventType;
  participant?: string;
  speaker?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

export interface AudioChunkData {
  meetingId: string;
  chunkIndex: number;
  blob: Blob;
  duration: number;
  timestamp: string;
}

// ---------- Extension Messages ----------

export type MessageType =
  | 'ENABLE_CAPTURE'
  | 'DISABLE_CAPTURE'
  | 'START_SCRAPING'
  | 'STOP_SCRAPING'
  | 'MEETING_DATA'
  | 'AUDIO_CHUNK'
  | 'START_AUDIO'
  | 'STOP_AUDIO'
  | 'CAPTURE_STATE_QUERY'
  | 'CAPTURE_STATE_RESPONSE';

export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
}

// ---------- Storage ----------

export interface StorageState {
  captureEnabled: boolean;
  currentMeetingId: string | null;
  pendingEvents: MeetingEvent[];
  pendingChats: ChatMessage[];
}

// ---------- Adapter Interface ----------

export interface MeetingAdapter {
  getPlatform(): Platform;
  getMeetingTitle(): string | null;
  getMeetingId(): string | null;
  getParticipants(): string[];
  getActiveSpeaker(): string | null;
  getChatMessages(): ChatMessage[];
  isScreenSharing(): { active: boolean; participant?: string };
  getParticipantListContainer(): Element | null;
  getChatContainer(): Element | null;
  getSpeakerIndicatorElements(): Element[];
  isInMeeting(): boolean;
}
