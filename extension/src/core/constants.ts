// ============================================================
// Constants for Meet Scraper Extension
// ============================================================

export const BACKEND_URL = 'http://localhost:3001/api';
export const API_KEY = 'ms-dev-api-key-change-in-production';

// Batch settings
export const EVENT_BATCH_SIZE = 10;
export const EVENT_BATCH_INTERVAL_MS = 5000;
export const CHAT_BATCH_SIZE = 10;
export const CHAT_BATCH_INTERVAL_MS = 5000;

// Audio settings
export const AUDIO_CHUNK_DURATION_MS = 30000; // 30 seconds
export const AUDIO_MIME_TYPE = 'audio/webm;codecs=opus';

// Observer settings
export const SPEAKER_DEBOUNCE_MS = 300;
export const OBSERVER_RECONNECT_INTERVAL_MS = 30000;

// Google Meet selectors (resilient, aria-based)
export const GMEET_SELECTORS = {
  // Meeting title — data attribute or document title
  meetingTitle: '[data-meeting-title]',
  meetingTitleFallback: '.roSPhc',

  // Participant tiles
  participantTile: '[data-self-name]',
  participantName: '[data-self-name]',
  
  // People sidebar
  peopleSidebar: '[aria-label="People"]',
  peopleListItem: '[role="listitem"]',
  
  // Active speaker — blue border or "is presenting" aria
  speakerIndicator: '[aria-label*="is speaking"]',
  speakerBorderSelector: '[data-allocation-index]',

  // Chat panel
  chatPanel: '[aria-label="Chat with everyone"]',
  chatMessage: '[data-message-text]',
  chatSender: '[data-sender-name]',

  // Screen sharing
  screenShareIndicator: '[aria-label*="presenting"]',
  screenShareActive: '[data-is-screen-sharing="true"]',

  // General containers for MutationObserver attachment
  mainContent: '[data-meeting-id]',
  meetingContainer: '#ow3',
} as const;

// Zoho Meeting selectors (best-effort, may need updates)
export const ZOHO_SELECTORS = {
  meetingTitle: '.meeting-title, [class*="meetingTitle"]',
  participantList: '[class*="participant"], [class*="attendee"]',
  participantName: '[class*="participantName"], [class*="attendeeName"]',
  chatContainer: '[class*="chatContainer"], [class*="chat-panel"]',
  chatMessage: '[class*="chatMessage"], [class*="message-text"]',
  chatSender: '[class*="senderName"], [class*="message-sender"]',
  speakerIndicator: '[class*="speaking"], [class*="active-speaker"]',
  screenShareIndicator: '[class*="screenShare"], [class*="presenting"]',
  meetingContainer: '[class*="meeting-room"], [class*="conferenceRoom"]',
} as const;
