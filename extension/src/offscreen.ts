z// ============================================================
// Offscreen Document — Audio Capture & Mixing
// 
// This runs in a hidden document and provides:
// 1. Tab audio capture (via chromeMediaSource)
// 2. Microphone capture
// 3. Audio mixing via Web Audio API
// 4. MediaRecorder with 30-second chunks
// 5. Chunk relay to background for upload
// ============================================================

import { AUDIO_CHUNK_DURATION_MS, AUDIO_MIME_TYPE } from './core/constants';
import type { ExtensionMessage } from './core/types';

let mediaRecorder: MediaRecorder | null = null;
let audioContext: AudioContext | null = null;
let tabStream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let chunkDuration = AUDIO_CHUNK_DURATION_MS / 1000; // in seconds

// ── Listen for messages from background ─────────────────────
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'START_AUDIO':
        startRecording(message.payload.streamId)
          .then(() => sendResponse({ success: true }))
          .catch((err) => {
            console.error('[Offscreen] Start recording failed:', err);
            sendResponse({ success: false, error: err.message });
          });
        return true;

      case 'STOP_AUDIO':
        stopRecording();
        sendResponse({ success: true });
        break;
    }
  }
);

// ── Start Recording ─────────────────────────────────────────
async function startRecording(streamId: string): Promise<void> {
  console.log('[Offscreen] Starting audio capture...');

  // 1. Get tab audio stream
  tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    } as any,
  });

  // 2. Try to get microphone stream
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    console.log('[Offscreen] Microphone captured');
  } catch (err) {
    console.warn('[Offscreen] Microphone capture failed (continuing with tab audio only):', err);
    micStream = null;
  }

  // 3. Mix audio streams using Web Audio API
  audioContext = new AudioContext();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const tabSource = audioContext.createMediaStreamSource(tabStream);
  const destination = audioContext.createMediaStreamDestination();

  // Connect tab audio to output (so user still hears it)
  tabSource.connect(audioContext.destination);
  // Connect tab audio to recorder destination
  tabSource.connect(destination);

  if (micStream) {
    const micSource = audioContext.createMediaStreamSource(micStream);
    // Mic goes to recorder only (not to speakers to avoid feedback)
    micSource.connect(destination);
  }

  // 4. Create MediaRecorder on the mixed stream
  const mixedStream = destination.stream;

  // Find best supported mime type
  const mimeType = MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE)
    ? AUDIO_MIME_TYPE
    : MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : '';

  mediaRecorder = new MediaRecorder(mixedStream, {
    mimeType: mimeType || undefined,
    audioBitsPerSecond: 128000,
  });

  // 5. Handle data chunks
  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size === 0) return;

    console.log(`[Offscreen] Audio chunk: ${event.data.size} bytes`);

    // Convert Blob to base64 for sending via chrome.runtime.sendMessage
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      chrome.runtime.sendMessage({
        type: 'AUDIO_CHUNK',
        payload: {
          base64Data: base64,
          mimeType: event.data.type || 'audio/webm',
          duration: chunkDuration,
          size: event.data.size,
        },
      } as ExtensionMessage);
    };
    reader.readAsDataURL(event.data);
  };

  mediaRecorder.onerror = (event) => {
    console.error('[Offscreen] MediaRecorder error:', event);
  };

  mediaRecorder.onstop = () => {
    console.log('[Offscreen] MediaRecorder stopped');
  };

  // 6. Start recording with timeslice for chunking
  mediaRecorder.start(AUDIO_CHUNK_DURATION_MS);
  console.log(`[Offscreen] Recording started (${AUDIO_CHUNK_DURATION_MS / 1000}s chunks)`);
}

// ── Stop Recording ──────────────────────────────────────────
function stopRecording(): void {
  console.log('[Offscreen] Stopping audio capture...');

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  mediaRecorder = null;

  // Stop all tracks
  tabStream?.getTracks().forEach((t) => t.stop());
  micStream?.getTracks().forEach((t) => t.stop());
  tabStream = null;
  micStream = null;

  // Close audio context
  audioContext?.close();
  audioContext = null;
}

console.log('[Offscreen] Audio capture document loaded');
