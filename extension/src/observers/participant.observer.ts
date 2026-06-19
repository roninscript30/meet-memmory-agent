import type { MeetingAdapter } from '../core/types';
import { eventBus } from '../core/event-bus';

/**
 * Observes participant list changes using MutationObserver.
 * Detects joins and leaves by diffing against a known set.
 */
export class ParticipantObserver {
  private observer: MutationObserver | null = null;
  private knownParticipants: Set<string> = new Set();
  private adapter: MeetingAdapter;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(adapter: MeetingAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    console.log('[ParticipantObserver] Starting...');

    // Initial scan
    this.scanParticipants();

    // Try to attach MutationObserver to participant container
    this.attachObserver();

    // Fallback poll every 10s in case the panel opens/closes
    this.pollInterval = setInterval(() => {
      this.attachObserver();
      this.scanParticipants();
    }, 10000);
  }

  stop(): void {
    console.log('[ParticipantObserver] Stopping...');
    this.observer?.disconnect();
    this.observer = null;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Mark all remaining participants as left
    const now = new Date().toISOString();
    this.knownParticipants.forEach((name) => {
      eventBus.emit('participant_left', { name, timestamp: now });
    });

    this.knownParticipants.clear();
  }

  private attachObserver(): void {
    if (this.observer) return; // Already attached

    const container = this.adapter.getParticipantListContainer();
    if (!container) return; // Panel not open

    this.observer = new MutationObserver(() => {
      this.scanParticipants();
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    console.log('[ParticipantObserver] MutationObserver attached');
  }

  private scanParticipants(): void {
    const current = new Set(this.adapter.getParticipants());
    const now = new Date().toISOString();

    // Detect joins
    current.forEach((name) => {
      if (!this.knownParticipants.has(name)) {
        console.log(`[ParticipantObserver] Joined: ${name}`);
        eventBus.emit('participant_joined', { name, timestamp: now });
      }
    });

    // Detect leaves
    this.knownParticipants.forEach((name) => {
      if (!current.has(name)) {
        console.log(`[ParticipantObserver] Left: ${name}`);
        eventBus.emit('participant_left', { name, timestamp: now });
      }
    });

    this.knownParticipants = current;
  }
}
