import type { PlasmoCSConfig } from 'plasmo';
import { GoogleMeetAdapter } from '../adapters/google-meet.adapter';
import { ZohoMeetAdapter } from '../adapters/zoho-meet.adapter';
import { ParticipantObserver } from '../observers/participant.observer';
import { ChatObserver } from '../observers/chat.observer';
import { SpeakerObserver } from '../observers/speaker.observer';
import { ScreenShareObserver } from '../observers/screenshare.observer';
import { eventBus } from '../core/event-bus';
import type { MeetingAdapter, MeetingMetadata, ExtensionMessage } from '../core/types';

// ── Plasmo content script config ────────────────────────────
export const config: PlasmoCSConfig = {
  matches: [
    'https://meet.google.com/*',
    'https://meeting.zoho.com/*',
  ],
  run_at: 'document_idle',
};

// ── State ───────────────────────────────────────────────────
let adapter: MeetingAdapter | null = null;
let participantObserver: ParticipantObserver | null = null;
let chatObserver: ChatObserver | null = null;
let speakerObserver: SpeakerObserver | null = null;
let screenShareObserver: ScreenShareObserver | null = null;
let isRunning = false;
let currentMeetingId: string | null = null;

// ── Platform Detection ──────────────────────────────────────
function detectPlatform(): MeetingAdapter | null {
  const url = window.location.href;

  if (url.includes('meet.google.com')) {
    console.log('[MeetScraper] Detected Google Meet');
    return new GoogleMeetAdapter();
  }

  if (url.includes('meeting.zoho.com')) {
    console.log('[MeetScraper] Detected Zoho Meeting');
    return new ZohoMeetAdapter();
  }

  console.warn('[MeetScraper] Unknown platform:', url);
  return null;
}

// ── Start Scraping ──────────────────────────────────────────
function startScraping(): void {
  if (isRunning) {
    console.log('[MeetScraper] Already running');
    return;
  }

  adapter = detectPlatform();
  if (!adapter) return;

  const meetingId = adapter.getMeetingId();
  if (!meetingId) {
    console.log('[MeetScraper] Not inside a meeting room, skipping scraping.');
    return;
  }

  if (!adapter.isInMeeting()) {
    console.log('[MeetScraper] Not fully joined the meeting yet, waiting...');
    return;
  }

  console.log('[MeetScraper] Starting data collection...');
  isRunning = true;

  // Call optional adapter startup hooks
  adapter.onStartScraping?.();

  // Get meeting metadata
  currentMeetingId = meetingId;
  const metadata: MeetingMetadata = {
    meetingId: currentMeetingId,
    title: adapter.getMeetingTitle() || 'Untitled Meeting',
    platform: adapter.getPlatform(),
    url: window.location.href,
    startedAt: new Date().toISOString(),
  };

  // Send meeting started event to background
  chrome.runtime.sendMessage({
    type: 'MEETING_DATA',
    payload: {
      action: 'meeting_started',
      data: metadata,
    },
  } as ExtensionMessage);

  // ── Wire up EventBus listeners ──────────────────────────
  eventBus.on('participant_joined', (data) => {
    chrome.runtime.sendMessage({
      type: 'MEETING_DATA',
      payload: {
        action: 'participant_joined',
        meetingId: currentMeetingId,
        data,
      },
    });
  });

  eventBus.on('participant_left', (data) => {
    chrome.runtime.sendMessage({
      type: 'MEETING_DATA',
      payload: {
        action: 'participant_left',
        meetingId: currentMeetingId,
        data,
      },
    });
  });

  eventBus.on('chat_message', (data) => {
    chrome.runtime.sendMessage({
      type: 'MEETING_DATA',
      payload: {
        action: 'chat_message',
        meetingId: currentMeetingId,
        data,
      },
    });
  });

  eventBus.on('speaker_changed', (data) => {
    chrome.runtime.sendMessage({
      type: 'MEETING_DATA',
      payload: {
        action: 'speaker_changed',
        meetingId: currentMeetingId,
        data,
      },
    });
  });

  eventBus.on('screen_share_started', (data) => {
    chrome.runtime.sendMessage({
      type: 'MEETING_DATA',
      payload: {
        action: 'screen_share_started',
        meetingId: currentMeetingId,
        data,
      },
    });
  });

  eventBus.on('screen_share_stopped', (data) => {
    chrome.runtime.sendMessage({
      type: 'MEETING_DATA',
      payload: {
        action: 'screen_share_stopped',
        meetingId: currentMeetingId,
        data,
      },
    });
  });

  // ── Start observers ─────────────────────────────────────
  // Delay start slightly to let the meeting UI fully render
  setTimeout(() => {
    if (!adapter || !isRunning) return;

    participantObserver = new ParticipantObserver(adapter);
    chatObserver = new ChatObserver(adapter);
    speakerObserver = new SpeakerObserver(adapter);
    screenShareObserver = new ScreenShareObserver(adapter);

    participantObserver.start();
    chatObserver.start();
    speakerObserver.start();
    screenShareObserver.start();

    console.log('[MeetScraper] All observers started');
  }, 3000);
}

// ── Stop Scraping ───────────────────────────────────────────
function stopScraping(): void {
  if (!isRunning) return;

  console.log('[MeetScraper] Stopping data collection...');

  participantObserver?.stop();
  chatObserver?.stop();
  speakerObserver?.stop();
  screenShareObserver?.stop();

  // Send meeting ended event
  if (currentMeetingId) {
    chrome.runtime.sendMessage({
      type: 'MEETING_DATA',
      payload: {
        action: 'meeting_ended',
        meetingId: currentMeetingId,
        data: { timestamp: new Date().toISOString() },
      },
    });
  }

  // Cleanup
  eventBus.clear();
  participantObserver = null;
  chatObserver = null;
  speakerObserver = null;
  screenShareObserver = null;
  adapter = null;
  isRunning = false;
  currentMeetingId = null;
}

// ── Listen for messages from background ─────────────────────
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    console.log('[MeetScraper] Received message:', message.type);

    switch (message.type) {
      case 'START_SCRAPING':
        startScraping();
        sendResponse({ success: true });
        break;

      case 'STOP_SCRAPING':
        stopScraping();
        sendResponse({ success: true });
        break;

      case 'CAPTURE_STATE_QUERY':
        sendResponse({ isRunning, meetingId: currentMeetingId });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep channel open for async response
  }
);

// ── State Polling Loop ──────────────────────────────────────
// Periodically checks if the extension capture is enabled,
// and starts/stops scraping based on whether the user is in a meeting.
setInterval(() => {
  chrome.storage.local.get('captureEnabled', (result) => {
    if (!result.captureEnabled) {
      if (isRunning) {
        console.log('[MeetScraper] Capture disabled in settings, stopping collection');
        stopScraping();
      }
      return;
    }

    if (!adapter) {
      adapter = detectPlatform();
    }
    if (!adapter) return;

    const inMeeting = adapter.isInMeeting();

    if (!isRunning && inMeeting) {
      console.log('[MeetScraper] State Poller: Meeting joined, starting collection...');
      startScraping();
    } else if (isRunning && !inMeeting) {
      console.log('[MeetScraper] State Poller: Left meeting, stopping collection...');
      stopScraping();
    }
  });
}, 2000);

// ── Cleanup on page unload ──────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (isRunning) {
    stopScraping();
  }
});

console.log('[MeetScraper] Content script loaded on', window.location.href);
