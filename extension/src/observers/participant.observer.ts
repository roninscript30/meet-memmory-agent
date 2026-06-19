import type { MeetingAdapter } from '../core/types';
import { eventBus } from '../core/event-bus';

/**
 * Observes participant changes passively.
 * Uses a registry/set-diffing approach.
 * Detects joins from visible video tiles and sidebar (if open).
 * Detects leaves ONLY when the sidebar panel is manually open to prevent false leaves.
 */
export class ParticipantObserver {
  private knownParticipants: Set<string> = new Set();
  private adapter: MeetingAdapter;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private bodyObserver: MutationObserver | null = null;

  constructor(adapter: MeetingAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    console.log('[PARTICIPANTS] Passive Observer starting...');

    // Run initial scan
    this.scanParticipants();

    // Set up a MutationObserver on document.body to detect structural shifts
    // (like video grid updates or sidebar mounts) in real time
    this.bodyObserver = new MutationObserver(() => {
      this.scanParticipants();
    });

    this.bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 3-second fallback poll
    this.pollInterval = setInterval(() => {
      this.scanParticipants();
    }, 3000);
  }

  stop(): void {
    console.log('[PARTICIPANTS] Passive Observer stopping...');
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.bodyObserver) {
      this.bodyObserver.disconnect();
      this.bodyObserver = null;
    }

    // Emit leave events for all remaining participants on stop
    const now = new Date().toISOString();
    this.knownParticipants.forEach((name) => {
      eventBus.emit('participant_left', { name, timestamp: now });
    });

    this.knownParticipants.clear();
  }

  public scanParticipants(): void {
    const sidebarOpen = this.adapter.getParticipantListContainer() !== null;
    const current = this.adapter.getParticipants();
    const now = new Date().toISOString();

    if (sidebarOpen) {
      // 1. Sidebar is open: ground-truth list is active.
      // We can perform a full diff to detect both joins and leaves.
      const currentSet = new Set(current);

      // Detect joins
      currentSet.forEach((name) => {
        if (!this.knownParticipants.has(name)) {
          console.log(`[PARTICIPANTS] Joined (Sidebar): ${name}`);
          this.knownParticipants.add(name);
          eventBus.emit('participant_joined', { name, timestamp: now });
        }
      });

      // Detect leaves
      this.knownParticipants.forEach((name) => {
        if (!currentSet.has(name)) {
          console.log(`[PARTICIPANTS] Left (Sidebar): ${name}`);
          this.knownParticipants.delete(name);
          eventBus.emit('participant_left', { name, timestamp: now });
        }
      });
    } else {
      // 2. Sidebar is closed: we are scanning visible grid tiles.
      // We can detect new participants (joins), but we NEVER assume
      // someone has left just because their tile was paged/hidden.
      current.forEach((name) => {
        if (!this.knownParticipants.has(name)) {
          console.log(`[PARTICIPANTS] Joined (Grid Tile): ${name}`);
          this.knownParticipants.add(name);
          eventBus.emit('participant_joined', { name, timestamp: now });
        }
      });
    }
  }
}
