import type { MeetingAdapter } from '../core/types';
import { eventBus } from '../core/event-bus';
import { SPEAKER_DEBOUNCE_MS } from '../core/constants';

/**
 * Observes active speaker changes.
 * Uses MutationObserver on video tiles + periodic polling.
 * Debounces rapid speaker changes (300ms).
 */
export class SpeakerObserver {
  private observer: MutationObserver | null = null;
  private currentSpeaker: string | null = null;
  private adapter: MeetingAdapter;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(adapter: MeetingAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    console.log('[SpeakerObserver] Starting...');

    // Initial check
    this.checkSpeaker();

    // Observe the main meeting area for attribute/style changes
    this.attachObserver();

    // Poll every 2s as a reliable fallback
    this.pollInterval = setInterval(() => {
      this.checkSpeaker();
    }, 2000);
  }

  stop(): void {
    console.log('[SpeakerObserver] Stopping...');
    this.observer?.disconnect();
    this.observer = null;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.currentSpeaker = null;
  }

  private attachObserver(): void {
    if (this.observer) return;

    // Observe video tile containers for attribute changes (border, class, aria)
    const elements = this.adapter.getSpeakerIndicatorElements();
    if (elements.length === 0) {
      // Fallback: observe the entire body for changes
      this.observer = new MutationObserver(() => {
        this.debouncedCheck();
      });

      this.observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['aria-label', 'class', 'style'],
        subtree: true,
      });
    } else {
      this.observer = new MutationObserver(() => {
        this.debouncedCheck();
      });

      // Observe parent of tiles
      const parent = elements[0]?.parentElement || document.body;
      this.observer.observe(parent, {
        attributes: true,
        attributeFilter: ['aria-label', 'class', 'style'],
        subtree: true,
        childList: true,
      });
    }

    console.log('[SpeakerObserver] MutationObserver attached');
  }

  private debouncedCheck(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.checkSpeaker();
    }, SPEAKER_DEBOUNCE_MS);
  }

  private checkSpeaker(): void {
    const speaker = this.adapter.getActiveSpeaker();

    if (speaker && speaker !== this.currentSpeaker) {
      console.log(`[SpeakerObserver] Speaker changed: ${this.currentSpeaker} → ${speaker}`);
      this.currentSpeaker = speaker;

      eventBus.emit('speaker_changed', {
        speaker,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
