import type { MeetingAdapter, ChatMessage, Platform } from '../core/types';

/**
 * Base adapter with shared utility methods.
 * Platform-specific adapters extend this.
 */
export abstract class BaseAdapter implements MeetingAdapter {
  abstract getPlatform(): Platform;
  abstract getMeetingTitle(): string | null;
  abstract getMeetingId(): string | null;
  abstract getParticipants(): string[];
  abstract getActiveSpeaker(): string | null;
  abstract getChatMessages(): ChatMessage[];
  abstract isScreenSharing(): { active: boolean; participant?: string };
  abstract getParticipantListContainer(): Element | null;
  abstract getChatContainer(): Element | null;
  abstract getSpeakerIndicatorElements(): Element[];

  /**
   * Safely query a single element, trying multiple selectors.
   */
  protected queryFirst(selectors: string[]): Element | null {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {
        // Invalid selector, skip
      }
    }
    return null;
  }

  /**
   * Safely query all matching elements from multiple selectors.
   */
  protected queryAll(selectors: string[]): Element[] {
    const results: Element[] = [];
    const seen = new Set<Element>();

    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        });
      } catch {
        // Invalid selector, skip
      }
    }

    return results;
  }

  /**
   * Extract clean text content from an element.
   */
  protected getTextContent(el: Element | null): string {
    return el?.textContent?.trim() ?? '';
  }

  /**
   * Extract meeting ID from URL.
   */
  protected extractMeetingIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Google Meet: /abc-defg-hij
      // Zoho: /meeting/... or /join/...
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts[pathParts.length - 1] || urlObj.pathname;
    } catch {
      return url;
    }
  }
}
