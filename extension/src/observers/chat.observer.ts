import type { MeetingAdapter, ChatMessage } from '../core/types';
import { eventBus } from '../core/event-bus';

/**
 * Passively observes the chat panel for new messages using MutationObserver.
 * Dynamically binds when the user opens the chat panel, and disconnects when closed.
 */
export class ChatObserver {
  private observer: MutationObserver | null = null;
  private seenMessages: Set<string> = new Set();
  private adapter: MeetingAdapter;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastContainer: Element | null = null;

  constructor(adapter: MeetingAdapter) {
    this.adapter = adapter;
  }

  start(): void {
    console.log('[CHAT] Passive Observer starting...');

    // Initial check
    this.updateBinding();

    // Check panel presence every 2 seconds
    this.pollInterval = setInterval(() => {
      this.updateBinding();
    }, 2000);
  }

  stop(): void {
    console.log('[CHAT] Passive Observer stopping...');
    this.cleanupObserver();

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.seenMessages.clear();
  }

  private updateBinding(): void {
    const container = this.adapter.getChatContainer();

    if (container && !this.observer) {
      // Chat panel was opened: bind observer
      console.log('[CHAT] Chat panel detected. Binding MutationObserver...');
      this.lastContainer = container;
      this.scanMessages();

      this.observer = new MutationObserver(() => {
        this.scanMessages();
      });

      this.observer.observe(container, {
        childList: true,
        subtree: true,
      });
    } else if (!container && this.observer) {
      // Chat panel was closed: disconnect observer
      console.log('[CHAT] Chat panel unmounted. Unbinding MutationObserver...');
      this.cleanupObserver();
    }
  }

  private cleanupObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.lastContainer = null;
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
