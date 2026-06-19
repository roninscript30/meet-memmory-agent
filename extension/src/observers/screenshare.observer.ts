import type { MeetingAdapter } from '../core/types';
import { eventBus } from '../core/event-bus';

/**
 * Observes screen sharing state changes.
 * Polls periodically since screen share indicators may not have
 * a stable container to attach a MutationObserver to.
 */
export class ScreenShareObserver {
  private isSharing: boolean = false;
  private sharingParticipant: string | undefined;
  private adapter: MeetingAdapter;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(adapter: MeetingAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    console.log('[ScreenShareObserver] Starting...');

    // Initial check
    this.checkScreenShare();

    // Poll every 3s
    this.pollInterval = setInterval(() => {
      this.checkScreenShare();
    }, 3000);
  }

  stop(): void {
    console.log('[ScreenShareObserver] Stopping...');

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // If screen share was active, emit stopped
    if (this.isSharing) {
      eventBus.emit('screen_share_stopped', {
        participant: this.sharingParticipant,
        timestamp: new Date().toISOString(),
      });
    }

    this.isSharing = false;
    this.sharingParticipant = undefined;
  }

  private checkScreenShare(): void {
    const status = this.adapter.isScreenSharing();

    if (status.active && !this.isSharing) {
      // Screen share started
      console.log(`[ScreenShareObserver] Screen share started by ${status.participant || 'unknown'}`);
      this.isSharing = true;
      this.sharingParticipant = status.participant;

      eventBus.emit('screen_share_started', {
        participant: status.participant,
        timestamp: new Date().toISOString(),
      });
    } else if (!status.active && this.isSharing) {
      // Screen share stopped
      console.log(`[ScreenShareObserver] Screen share stopped`);
      eventBus.emit('screen_share_stopped', {
        participant: this.sharingParticipant,
        timestamp: new Date().toISOString(),
      });

      this.isSharing = false;
      this.sharingParticipant = undefined;
    }
  }
}
