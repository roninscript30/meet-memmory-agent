import { BaseAdapter } from './base.adapter';
import type { ChatMessage, Platform } from '../core/types';
import { ZOHO_SELECTORS } from '../core/constants';

/**
 * Zoho Meeting DOM adapter.
 * 
 * Zoho Meeting's DOM is dynamic and uses framework-generated classes.
 * This adapter uses broad selectors and MutationObserver fallbacks.
 * Selectors may need updating as Zoho updates their UI.
 */
export class ZohoMeetAdapter extends BaseAdapter {
  getPlatform(): Platform {
    return 'zoho_meeting';
  }

  isInMeeting(): boolean {
    const leaveBtn = this.queryFirst([
      '[aria-label="End Meeting"]',
      '[aria-label="Leave Meeting"]',
      '[aria-label="Exit Meeting"]',
      '[class*="leave"]',
      '[class*="exit-btn"]',
    ]);
    return !!leaveBtn;
  }

  getMeetingTitle(): string | null {
    const titleEl = this.queryFirst([
      ZOHO_SELECTORS.meetingTitle,
      'header [class*="title"]',
      '.zm-meeting-title',
    ]);

    if (titleEl) {
      return this.getTextContent(titleEl) || null;
    }

    // Fallback: parse from document title
    const docTitle = document.title;
    if (docTitle && docTitle !== 'Zoho Meeting') {
      return docTitle.replace(/\s*[-|]\s*Zoho Meeting\s*/i, '').trim() || null;
    }

    return this.getMeetingId();
  }

  getMeetingId(): string | null {
    // Zoho Meeting URLs vary: /meeting/join/xxx, /meeting/xxx, etc.
    const pathParts = window.location.pathname.split('/').filter(Boolean);

    // Try to find a meeting ID-like segment (numeric or alphanumeric)
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i];
      if (part && part !== 'meeting' && part !== 'join' && part.length > 3) {
        return part;
      }
    }

    // Fallback: URL search params
    const params = new URLSearchParams(window.location.search);
    return params.get('meetingId') || params.get('id') || this.extractMeetingIdFromUrl(window.location.href);
  }

  getParticipants(): string[] {
    const participants: string[] = [];

    const nameElements = this.queryAll([
      ZOHO_SELECTORS.participantName,
      '[class*="participant"] [class*="name"]',
      '[class*="attendee"] [class*="name"]',
      '[role="listitem"] [class*="name"]',
    ]);

    nameElements.forEach((el) => {
      const name = this.getTextContent(el);
      if (name && !participants.includes(name) && name.length < 100) {
        participants.push(name);
      }
    });

    // Fallback: look for aria-labels
    if (participants.length === 0) {
      document.querySelectorAll('[aria-label*="participant"], [aria-label*="attendee"]').forEach((el) => {
        const label = el.getAttribute('aria-label') || '';
        const name = label.replace(/participant|attendee/gi, '').trim();
        if (name && !participants.includes(name)) {
          participants.push(name);
        }
      });
    }

    return participants;
  }

  getActiveSpeaker(): string | null {
    const speakerEl = this.queryFirst([
      ZOHO_SELECTORS.speakerIndicator,
      '[class*="activeSpeaker"] [class*="name"]',
      '[class*="speaking"] [class*="name"]',
      '[aria-label*="speaking"]',
    ]);

    if (speakerEl) {
      // Check for aria-label first
      const label = speakerEl.getAttribute('aria-label');
      if (label) {
        const match = label.match(/(.*?)\s+is speaking/i);
        if (match) return match[1].trim();
        return label.trim();
      }
      return this.getTextContent(speakerEl) || null;
    }

    return null;
  }

  getChatMessages(): ChatMessage[] {
    const messages: ChatMessage[] = [];

    const chatContainer = this.getChatContainer();
    if (!chatContainer) return messages;

    const messageElements = this.queryAll([
      ZOHO_SELECTORS.chatMessage,
      '[class*="chat"] [class*="message"]',
    ]);

    messageElements.forEach((el) => {
      const message = this.getTextContent(el);
      const senderEl = el.closest('[class*="chatItem"], [class*="message-item"]')
        ?.querySelector('[class*="sender"], [class*="name"]');
      const sender = senderEl ? this.getTextContent(senderEl) : 'Unknown';

      if (message) {
        messages.push({
          sender,
          message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return messages;
  }

  isScreenSharing(): { active: boolean; participant?: string } {
    const shareEl = this.queryFirst([
      ZOHO_SELECTORS.screenShareIndicator,
      '[class*="screenShare"]',
      '[class*="presenting"]',
      '[aria-label*="screen share"]',
      '[aria-label*="presenting"]',
    ]);

    if (shareEl) {
      return { active: true };
    }

    return { active: false };
  }

  getParticipantListContainer(): Element | null {
    return this.queryFirst([
      ZOHO_SELECTORS.participantList,
      '[class*="participantList"]',
      '[class*="attendeeList"]',
      '[role="list"]',
    ]);
  }

  getChatContainer(): Element | null {
    return this.queryFirst([
      ZOHO_SELECTORS.chatContainer,
      '[class*="chat-panel"]',
      '[class*="chatContainer"]',
      '[aria-label*="chat"]',
    ]);
  }

  getSpeakerIndicatorElements(): Element[] {
    return this.queryAll([
      '[class*="video-tile"]',
      '[class*="participant-video"]',
      '[class*="speaker"]',
    ]);
  }
}
