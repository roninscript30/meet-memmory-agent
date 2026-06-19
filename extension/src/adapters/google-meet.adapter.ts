import { BaseAdapter } from './base.adapter';
import type { ChatMessage, Platform } from '../core/types';
import { GMEET_SELECTORS } from '../core/constants';

/**
 * Google Meet DOM adapter.
 * 
 * Strategy: Use aria-labels and data-attributes for resilience.
 * Google Meet uses obfuscated class names that change frequently,
 * so we prioritize accessibility attributes and structural selectors.
 */
export class GoogleMeetAdapter extends BaseAdapter {
  getPlatform(): Platform {
    return 'google_meet';
  }

  isInMeeting(): boolean {
    const leaveBtn = this.queryFirst([
      '[aria-label="Leave call"]',
      '[aria-label="Leave meeting"]',
      '[data-tooltip*="Leave call"]',
      '[data-tooltip*="Leave meeting"]',
    ]);
    return !!leaveBtn;
  }

  getMeetingTitle(): string | null {
    // Try data attribute first
    const titleEl = this.queryFirst([
      GMEET_SELECTORS.meetingTitle,
      GMEET_SELECTORS.meetingTitleFallback,
    ]);

    if (titleEl) {
      return this.getTextContent(titleEl) || null;
    }

    // Fallback: parse from document title ("Meeting Title - Google Meet")
    const docTitle = document.title;
    if (docTitle && docTitle.includes(' - Google Meet')) {
      return docTitle.replace(' - Google Meet', '').trim();
    }

    // Fallback: parse from URL
    return this.getMeetingId();
  }

  getMeetingId(): string | null {
    // Google Meet URLs: https://meet.google.com/abc-defg-hij
    const match = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
    if (match) return match[1];

    return null;
  }

  getParticipants(): string[] {
    const participants: string[] = [];

    // Method 1: data-self-name on video tiles
    document.querySelectorAll('[data-self-name]').forEach((el) => {
      const name = el.getAttribute('data-self-name');
      if (name && !participants.includes(name)) {
        participants.push(name);
      }
    });

    // Method 2: People sidebar (if open)
    const sidePanel = this.queryFirst([
      GMEET_SELECTORS.peopleSidebar,
      '[aria-label="Participants"]',
      '[aria-label="People"]',
    ]);

    if (sidePanel) {
      sidePanel.querySelectorAll('[role="listitem"]').forEach((item) => {
        const name = this.getTextContent(item);
        if (name && !participants.includes(name)) {
          // Clean up — remove status indicators like "(You)", "Host", etc.
          const cleanName = name
            .replace(/\s*\(You\)\s*/i, '')
            .replace(/\s*\(Host\)\s*/i, '')
            .replace(/\s*\(Organizer\)\s*/i, '')
            .trim();
          if (cleanName && !participants.includes(cleanName)) {
            participants.push(cleanName);
          }
        }
      });
    }

    // Method 3: video tiles by data-allocation-index and data-participant-id
    if (participants.length === 0) {
      document.querySelectorAll('[data-allocation-index], [data-participant-id]').forEach((el) => {
        // Try getting name from data-self-name or data-name
        let name = el.getAttribute('data-self-name') || el.getAttribute('data-name');
        
        // Try checking descendants for data-self-name
        if (!name) {
          const selfNameEl = el.querySelector('[data-self-name]');
          if (selfNameEl) {
            name = selfNameEl.getAttribute('data-self-name');
          }
        }

        // Try getting name from aria-label on the element or its descendants
        if (!name) {
          const labelEl = el.hasAttribute('aria-label') ? el : el.querySelector('[aria-label]');
          if (labelEl) {
            const label = labelEl.getAttribute('aria-label') || '';
            name = label
              .replace(/^Video of\s+/i, '')
              .replace(/['’]s video$/i, '')
              .replace(/\s*\(You\)\s*/i, '')
              .replace(/\s*\(Host\)\s*/i, '')
              .replace(/\s*\(Organizer\)\s*/i, '')
              .replace(/\s*Meeting host\s*/i, '')
              .trim();
          }
        }

        // Try getting name from text content of the name overlay (leaf text node)
        if (!name) {
          const nameEl = el.querySelector('[data-self-name]');
          if (nameEl) {
            name = nameEl.textContent?.trim();
          } else {
            // Find leaf text elements with length 2 to 50
            const leafNodes = Array.from(el.querySelectorAll('div, span, p')).filter(
              (sub) => sub.children.length === 0 && sub.textContent?.trim()
            );
            if (leafNodes.length > 0) {
              for (const leaf of leafNodes) {
                const text = leaf.textContent?.trim() || '';
                if (text.length > 1 && text.length < 50) {
                  name = text;
                  break;
                }
              }
            }
          }
        }

        if (name && !participants.includes(name) && name.length < 100) {
          // Exclude buttons or control labels that might slip through
          const lowerName = name.toLowerCase();
          const blacklistedKeywords = [
            'settings', 'camera', 'microphone', 'audio', 'video', 'screen', 
            'chat', 'people', 'more', 'leave', 'hand', 'reaction', 'host',
            'control', 'meeting', 'presenting', 'presentation', 'caption'
          ];
          const isBlacklisted = blacklistedKeywords.some(keyword => lowerName.includes(keyword));
          if (!isBlacklisted) {
            participants.push(name);
          }
        }
      });
    }

    return participants;
  }

  getActiveSpeaker(): string | null {
    // Method 1: aria-label containing "is speaking"
    const speakingEl = document.querySelector('[aria-label*="is speaking"]');
    if (speakingEl) {
      const label = speakingEl.getAttribute('aria-label') || '';
      const match = label.match(/(.*?)\s+is speaking/i);
      if (match) return match[1].trim();
    }

    // Method 2: Look for blue border (computed style)
    // Google Meet applies a distinctive blue border to the active speaker's tile
    const tiles = document.querySelectorAll('[data-allocation-index]');
    for (const tile of tiles) {
      const style = window.getComputedStyle(tile);
      const borderColor = style.borderColor || style.getPropertyValue('border-color');
      // Google's blue: rgb(66, 133, 244) or #4285f4
      if (
        borderColor?.includes('66, 133, 244') ||
        borderColor?.includes('26, 115, 232')
      ) {
        const nameEl = tile.querySelector('[data-self-name]');
        if (nameEl) {
          return nameEl.getAttribute('data-self-name') || null;
        }
      }
    }

    return null;
  }

  getChatMessages(): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Try to find chat messages in the chat panel
    const chatPanel = this.getChatContainer();
    if (!chatPanel) return messages;

    const messageElements = chatPanel.querySelectorAll(
      '[data-message-text], [role="listitem"]'
    );

    messageElements.forEach((el) => {
      const messageText =
        el.getAttribute('data-message-text') || this.getTextContent(el);
      const senderEl = el.querySelector('[data-sender-name]');
      const sender = senderEl
        ? senderEl.getAttribute('data-sender-name') || this.getTextContent(senderEl)
        : 'Unknown';

      if (messageText) {
        messages.push({
          sender: sender || 'Unknown',
          message: messageText,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return messages;
  }

  isScreenSharing(): { active: boolean; participant?: string } {
    // Check for "presenting" indicators
    const presentingEl = document.querySelector(
      '[aria-label*="presenting"], [aria-label*="Presentation"]'
    );

    if (presentingEl) {
      const label = presentingEl.getAttribute('aria-label') || '';
      const match = label.match(/(.*?)\s+is presenting/i);
      return {
        active: true,
        participant: match ? match[1].trim() : undefined,
      };
    }

    // Check for screen share specific attribute
    const shareEl = document.querySelector('[data-is-screen-sharing="true"]');
    if (shareEl) {
      return { active: true };
    }

    return { active: false };
  }

  getParticipantListContainer(): Element | null {
    return this.queryFirst([
      GMEET_SELECTORS.peopleSidebar,
      '[aria-label="Participants"]',
      '[aria-label="People"]',
    ]);
  }

  getChatContainer(): Element | null {
    return this.queryFirst([
      GMEET_SELECTORS.chatPanel,
      '[aria-label="Chat with everyone"]',
      '[aria-label="In-call messages"]',
      '[aria-label="Meeting chat"]',
    ]);
  }

  getSpeakerIndicatorElements(): Element[] {
    return this.queryAll([
      '[data-allocation-index]',
      '[data-self-name]',
    ]);
  }

  onStartScraping(): void {
    console.log('[GoogleMeetAdapter] Performing startup routine...');

    // 1. Sync participants by opening/closing People sidebar
    const sidebar = this.getParticipantListContainer();
    if (!sidebar) {
      const btn = document.querySelector('[aria-label="Show everyone"]');
      if (btn instanceof HTMLElement) {
        console.log('[GoogleMeetAdapter] Opening People sidebar to sync participants...');
        btn.click();
        
        setTimeout(() => {
          const closeBtn = document.querySelector('[aria-label="Close"]');
          if (closeBtn instanceof HTMLElement) {
            closeBtn.click();
            console.log('[GoogleMeetAdapter] Closed People sidebar');
          }
        }, 1500);
      }
    }

    // 2. Sync chats by opening/closing Chat panel (delayed so it doesn't conflict with sidebar)
    setTimeout(() => {
      const chatPanel = this.getChatContainer();
      if (!chatPanel) {
        const btn = document.querySelector('[aria-label="Chat with everyone"]');
        if (btn instanceof HTMLElement) {
          console.log('[GoogleMeetAdapter] Opening Chat panel to sync messages...');
          btn.click();
          
          setTimeout(() => {
            const closeBtn = document.querySelector('[aria-label="Close"]');
            if (closeBtn instanceof HTMLElement) {
              closeBtn.click();
              console.log('[GoogleMeetAdapter] Closed Chat panel');
            }
          }, 1500);
        }
      }
    }, 2000);
  }
}
