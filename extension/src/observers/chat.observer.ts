import type { MeetingAdapter, ChatMessage } from '../core/types';
import { eventBus } from '../core/event-bus';

/**
 * Observes chat panel for new messages using MutationObserver.
 * Deduplicates messages using a content hash.
 */
export class ChatObserver {
  private observer: MutationObserver | null = null;
  private seenMessages: Set<string> = new Set();
  private adapter: MeetingAdapter;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(adapter: MeetingAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    console.log('[CHAT] Observer starting...');

    // Initial scan
    this.scanMessages();

    // Attach MutationObserver
    this.attachObserver();

    // Fallback poll every 15s for when chat panel opens/closes
    this.pollInterval = setInterval(() => {
      this.attachObserver();
      this.scanMessages();
    }, 15000);
  }

  stop(): void {
    console.log('[CHAT] Observer stopping...');
    this.observer?.disconnect();
    this.observer = null;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.seenMessages.clear();
  }

  private attachObserver(): void {
    if (this.observer) return;

    const container = this.adapter.getChatContainer();
    if (!container) return;

    this.observer = new MutationObserver(() => {
      this.scanMessages();
    });

    this.observer.observe(container, {
      childList: true,
      subtree: true,
    });

    console.log('[CHAT] MutationObserver attached to container');
  }

  public scanMessages(): void {
    const messages = this.adapter.getChatMessages();

    messages.forEach((msg) => {
      const hash = this.hashMessage(msg);
      if (!this.seenMessages.has(hash)) {
        this.seenMessages.add(hash);
        console.log(`[CHAT] New message from ${msg.sender}: ${msg.message.substring(0, 50)}`);
        eventBus.emit('chat_message', msg);
      }
    });
  }

  private hashMessage(msg: ChatMessage): string {
    return `${msg.sender}:${msg.message}`;
  }
}
