import { apiService } from './services/api.service';
import { storageService } from './services/storage.service';
import type { ExtensionMessage, MeetingMetadata } from './core/types';
import offscreenUrl from 'url:./offscreen.html';

// ============================================================
// Background Service Worker
// Orchestrates: content scripts, offscreen document, API calls
// ============================================================

let currentMeetingId: string | null = null;
let audioChunkIndex = 0;

// ── Message Handler ─────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender)
      .then((result) => sendResponse(result))
      .catch((err) => {
        console.error('[Background] Error handling message:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep channel open for async
  }
);

async function handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender) {
  console.log('[Background] Message:', message.type);

  switch (message.type) {
    case 'ENABLE_CAPTURE':
      return handleEnableCapture();

    case 'DISABLE_CAPTURE':
      return handleDisableCapture();

    case 'MEETING_DATA':
      return handleMeetingData(message.payload);

    case 'AUDIO_CHUNK':
      return handleAudioChunk(message.payload);

    case 'CAPTURE_STATE_QUERY':
      const enabled = await storageService.isCaptureEnabled();
      return { captureEnabled: enabled, meetingId: currentMeetingId };

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// ── Enable/Disable Capture ──────────────────────────────────
async function handleEnableCapture() {
  await storageService.setCaptureEnabled(true);
  console.log('[Background] Capture ENABLED');

  // Send START_SCRAPING to all meeting tabs
  const tabs = await chrome.tabs.query({
    url: ['https://meet.google.com/*', 'https://meeting.zoho.com/*'],
  });

  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_SCRAPING' });
        console.log(`[Background] Sent START_SCRAPING to tab ${tab.id}`);

        // Start audio capture for this tab
        await startAudioCapture(tab.id);
      } catch (err) {
        console.warn(`[Background] Could not message tab ${tab.id}:`, err);
      }
    }
  }

  return { success: true };
}

async function handleDisableCapture() {
  await storageService.setCaptureEnabled(false);
  console.log('[Background] Capture DISABLED');

  // Send STOP_SCRAPING to all meeting tabs
  const tabs = await chrome.tabs.query({
    url: ['https://meet.google.com/*', 'https://meeting.zoho.com/*'],
  });

  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'STOP_SCRAPING' });
      } catch (err) {
        // Tab might not have content script loaded
      }
    }
  }

  // Stop audio capture
  await stopAudioCapture();

  // Flush remaining data
  if (currentMeetingId) {
    apiService.flushAll(currentMeetingId);
  }

  return { success: true };
}

// ── Meeting Data Handler ────────────────────────────────────
async function handleMeetingData(payload: any) {
  const { action, meetingId, data } = payload;

  try {
    switch (action) {
      case 'meeting_started': {
        const metadata = data as MeetingMetadata;
        currentMeetingId = metadata.meetingId;
        audioChunkIndex = 0;
        await storageService.setCurrentMeetingId(currentMeetingId);
        await apiService.createMeeting(metadata);
        console.log('[Background] Meeting created:', currentMeetingId);
        break;
      }

      case 'meeting_ended': {
        if (currentMeetingId) {
          apiService.flushAll(currentMeetingId);
          await apiService.endMeeting(currentMeetingId);
          console.log('[Background] Meeting ended:', currentMeetingId);
          currentMeetingId = null;
          await storageService.setCurrentMeetingId(null);
        }
        break;
      }

      case 'participant_joined': {
        if (meetingId) {
          await apiService.addParticipant(meetingId, data.name);
          apiService.queueEvent(meetingId, {
            type: 'participant_joined',
            participant: data.name,
            timestamp: data.timestamp,
          });
        }
        break;
      }

      case 'participant_left': {
        if (meetingId) {
          await apiService.removeParticipant(meetingId, data.name);
          apiService.queueEvent(meetingId, {
            type: 'participant_left',
            participant: data.name,
            timestamp: data.timestamp,
          });
        }
        break;
      }

      case 'chat_message': {
        if (meetingId) {
          apiService.queueChat(meetingId, {
            sender: data.sender,
            message: data.message,
            timestamp: data.timestamp,
          });
        }
        break;
      }

      case 'speaker_changed': {
        if (meetingId) {
          apiService.queueEvent(meetingId, {
            type: 'speaker_changed',
            speaker: data.speaker,
            timestamp: data.timestamp,
          });
        }
        break;
      }

      case 'screen_share_started': {
        if (meetingId) {
          apiService.queueEvent(meetingId, {
            type: 'screen_share_started',
            participant: data.participant,
            timestamp: data.timestamp,
          });
        }
        break;
      }

      case 'screen_share_stopped': {
        if (meetingId) {
          apiService.queueEvent(meetingId, {
            type: 'screen_share_stopped',
            participant: data.participant,
            timestamp: data.timestamp,
          });
        }
        break;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Background] Error handling meeting data:', error);
    return { success: false, error: error.message };
  }
}

// ── Audio Capture ───────────────────────────────────────────
async function startAudioCapture(tabId: number) {
  try {
    // Get stream ID for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    // Create offscreen document if it doesn't exist
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT as any],
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: offscreenUrl,
        reasons: [chrome.offscreen.Reason.USER_MEDIA as any],
        justification: 'Recording meeting audio for transcription',
      });
    }

    // Send stream ID to offscreen document
    chrome.runtime.sendMessage({
      type: 'START_AUDIO',
      payload: { streamId, tabId },
    });

    console.log('[Background] Audio capture started for tab', tabId);
  } catch (error) {
    console.error('[Background] Failed to start audio capture:', error);
  }
}

async function stopAudioCapture() {
  try {
    chrome.runtime.sendMessage({ type: 'STOP_AUDIO' });

    // Close offscreen document
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT as any],
    });

    if (existingContexts.length > 0) {
      await chrome.offscreen.closeDocument();
    }

    console.log('[Background] Audio capture stopped');
  } catch (error) {
    console.error('[Background] Error stopping audio capture:', error);
  }
}

// ── Audio Chunk Handler ─────────────────────────────────────
async function handleAudioChunk(payload: any) {
  if (!currentMeetingId) {
    console.warn('[Background] No active meeting for audio chunk');
    return { success: false };
  }

  try {
    const { base64Data, mimeType, duration } = payload;

    // Convert base64 to Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType || 'audio/webm' });

    await apiService.uploadAudioChunk(
      currentMeetingId,
      audioChunkIndex,
      blob,
      duration || 30
    );

    console.log(`[Background] Audio chunk ${audioChunkIndex} uploaded`);
    audioChunkIndex++;

    return { success: true };
  } catch (error: any) {
    console.error('[Background] Audio chunk upload failed:', error);
    return { success: false, error: error.message };
  }
}

// ── Tab change listener — auto-detect meeting tabs ──────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const enabled = await storageService.isCaptureEnabled();
  if (!enabled) return;

  const url = tab.url || '';
  if (url.includes('meet.google.com/') || url.includes('meeting.zoho.com/')) {
    // Wait for content script to load
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'START_SCRAPING' });
        await startAudioCapture(tabId);
      } catch {
        // Content script might not be loaded yet
      }
    }, 3000);
  }
});

console.log('[Background] Service worker initialized');
