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

    // Method 1: People sidebar (if open/mounted)
    const sidePanel = this.getParticipantListContainer();

    if (sidePanel) {
      sidePanel.querySelectorAll('[role="listitem"]').forEach((item) => {
        // Heuristic 1: Get name from profile avatar image alt attribute
        const img = item.querySelector('img');
        let name = img?.getAttribute('alt')?.trim();

        // Heuristic 2: Get the text content of the first element (span/div) inside the item
        if (!name) {
          const textEls = Array.from(item.querySelectorAll('span, div')).filter(
            (el) => el.children.length === 0 && el.textContent?.trim()
          );
          if (textEls.length > 0) {
            name = textEls[0].textContent?.trim();
          }
        }

        if (name) {
          // Clean up — remove status indicators like "(You)", "Host", etc.
          const cleanName = name
            .replace(/\s*\(You\)\s*/i, '')
            .replace(/\s*\(Host\)\s*/i, '')
            .replace(/\s*\(Organizer\)\s*/i, '')
            .replace(/\s*Meeting host\s*/i, '')
            .replace(/\s*Pin participant\s*/i, '')
            .replace(/\s*Mute participant\s*/i, '')
            .trim();
          if (cleanName && !participants.includes(cleanName)) {
            participants.push(cleanName);
          }
        }
      });
    }

    // Method 2: video tiles by data-allocation-index
    if (participants.length === 0) {
      document.querySelectorAll('[data-allocation-index]').forEach((el) => {
        let name = el.getAttribute('data-self-name') || el.getAttribute('data-name');
        
        if (!name) {
          const selfNameEl = el.querySelector('[data-self-name]');
          if (selfNameEl) {
            name = selfNameEl.getAttribute('data-self-name');
          }
        }

        if (!name) {
          const text = el.textContent?.trim();
          if (text) {
            name = text
              .replace(/\s*\([^)]*\)/g, '')
              .replace(/\s*Host\b/i, '')
              .replace(/\s*Organizer\b/i, '')
              .trim();
          }
        }

        if (name && !participants.includes(name) && name.length < 100) {
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
    // Method 1: aria-label/title containing "speaking"
    const speakingIndicators = document.querySelectorAll(
      '[aria-label*="speaking"], [title*="speaking"], [aria-label*="is speaking"]'
    );
    for (const indicator of speakingIndicators) {
      const label = indicator.getAttribute('aria-label') || indicator.getAttribute('title') || '';
      const match = label.match(/(.*?)\s+(?:is\s+)?speaking/i);
      if (match) {
        const name = match[1].trim();
        if (name && name.toLowerCase() !== 'microphone') {
          return name;
        }
      }
    }

    // Method 2: Look for blue border outline on video tiles
    const tiles = document.querySelectorAll('[data-allocation-index]');
    for (const tile of tiles) {
      const style = window.getComputedStyle(tile);
      const borderColor = style.borderColor || style.getPropertyValue('border-color');
      const outlineColor = style.outlineColor || style.getPropertyValue('outline-color');
      const boxHighlight = borderColor?.includes('66, 133, 244') || 
                           borderColor?.includes('26, 115, 232') ||
                           outlineColor?.includes('66, 133, 244') ||
                           outlineColor?.includes('26, 115, 232');

      if (boxHighlight) {
        const text = tile.textContent?.trim();
        if (text) {
          const cleanName = text
            .replace(/\s*\([^)]*\)/g, '')
            .replace(/\s*Host\b/i, '')
            .replace(/\s*Organizer\b/i, '')
            .trim();
          if (cleanName && cleanName.length < 50) {
            return cleanName;
          }
        }
      }
    }

    return null;
  }

  getChatMessages(): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const chatPanel = this.getChatContainer();
    if (!chatPanel) return messages;

    // Use stable jsname selectors for Google Meet chat structure
    const messageGroups = chatPanel.querySelectorAll('[jsname="YnAdTe"]');
    
    if (messageGroups.length > 0) {
      messageGroups.forEach((group) => {
        const senderEl = group.querySelector('[jsname="W72wCc"]');
        const sender = senderEl?.textContent?.trim() || 'Unknown';
        
        const textElements = group.querySelectorAll('[jsname="dotZ1e"]');
        textElements.forEach((textEl) => {
          const text = textEl.textContent?.trim();
          if (text) {
            messages.push({
              sender: sender || 'Unknown',
              message: text,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });
    } else {
      // Fallback in case jsname attributes change
      const listItems = chatPanel.querySelectorAll('[role="listitem"]');
      listItems.forEach((el) => {
        const divs = Array.from(el.querySelectorAll('div'));
        if (divs.length >= 2) {
          const sender = divs[0].textContent?.trim() || 'Unknown';
          const message = divs[divs.length - 1].textContent?.trim() || '';
          if (message && sender !== message) {
            messages.push({
              sender,
              message,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });
    }

    return messages;
  }

  isScreenSharing(): { active: boolean; participant?: string } {
    // Check for "presenting" indicators
    const presentingEl = document.querySelector(
      '[aria-label*="presenting"], [aria-label*="Presentation"], [aria-label*="screen share"]'
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
}
