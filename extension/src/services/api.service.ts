import { BACKEND_URL, API_KEY, EVENT_BATCH_SIZE, EVENT_BATCH_INTERVAL_MS } from '../core/constants';
import type { MeetingEvent, ChatMessage, MeetingMetadata } from '../core/types';

/**
 * API Service — handles all communication with the backend.
 * Supports batching, retry, and offline buffering.
 */
class ApiService {
  private eventQueues: Map<string, MeetingEvent[]> = new Map();
  private chatQueues: Map<string, ChatMessage[]> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline: boolean = true;

  constructor() {
    this.startFlushTimer();
  }

  // ── Meeting APIs ──────────────────────────────────────────

  async createMeeting(data: MeetingMetadata): Promise<any> {
    return this.post('/meetings', data);
  }

  async endMeeting(meetingId: string): Promise<any> {
    return this.patch(`/meetings/${meetingId}`, {
      endedAt: new Date().toISOString(),
      status: 'ended',
    });
  }

  // ── Participant APIs ──────────────────────────────────────

  async addParticipant(meetingId: string, name: string): Promise<any> {
    return this.post(`/meetings/${meetingId}/participants`, {
      name,
      joinedAt: new Date().toISOString(),
    });
  }

  async removeParticipant(meetingId: string, name: string): Promise<any> {
    return this.patch(
      `/meetings/${meetingId}/participants/${encodeURIComponent(name)}`,
      { leftAt: new Date().toISOString() }
    );
  }

  // ── Event Batching ────────────────────────────────────────

  queueEvent(meetingId: string, event: MeetingEvent): void {
    if (!this.eventQueues.has(meetingId)) {
      this.eventQueues.set(meetingId, []);
    }
    this.eventQueues.get(meetingId)!.push(event);

    if (this.eventQueues.get(meetingId)!.length >= EVENT_BATCH_SIZE) {
      this.flushEvents(meetingId);
    }
  }

  queueChat(meetingId: string, chat: ChatMessage): void {
    if (!this.chatQueues.has(meetingId)) {
      this.chatQueues.set(meetingId, []);
    }
    this.chatQueues.get(meetingId)!.push(chat);

    if (this.chatQueues.get(meetingId)!.length >= EVENT_BATCH_SIZE) {
      this.flushChats(meetingId);
    }
  }

  async flushEvents(meetingId: string): Promise<void> {
    const queue = this.eventQueues.get(meetingId);
    if (!queue || queue.length === 0) return;

    const events = [...queue];
    this.eventQueues.set(meetingId, []);

    try {
      await this.post(`/meetings/${meetingId}/events`, { events });
    } catch (err) {
      console.error(`[ApiService] Failed to flush events for ${meetingId}, re-queuing:`, err);
      const currentQueue = this.eventQueues.get(meetingId) || [];
      this.eventQueues.set(meetingId, [...events, ...currentQueue]);
    }
  }

  async flushChats(meetingId: string): Promise<void> {
    const queue = this.chatQueues.get(meetingId);
    if (!queue || queue.length === 0) return;

    const chats = [...queue];
    this.chatQueues.set(meetingId, []);

    try {
      await this.post(`/meetings/${meetingId}/chats`, { chats });
    } catch (err) {
      console.error(`[ApiService] Failed to flush chats for ${meetingId}, re-queuing:`, err);
      const currentQueue = this.chatQueues.get(meetingId) || [];
      this.chatQueues.set(meetingId, [...chats, ...currentQueue]);
    }
  }

  // ── Audio Upload ──────────────────────────────────────────

  async uploadAudioChunk(
    meetingId: string,
    chunkIndex: number,
    blob: Blob,
    duration: number
  ): Promise<any> {
    const formData = new FormData();
    formData.append('audio', blob, `chunk-${chunkIndex}.webm`);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('duration', String(duration));
    formData.append('timestamp', new Date().toISOString());

    const response = await fetch(`${BACKEND_URL}/meetings/${meetingId}/audio-chunks`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Audio upload failed: ${response.status}`);
    }

    return response.json();
  }

  // ── Lifecycle ─────────────────────────────────────────────

  flushAll(meetingId: string): void {
    this.flushEvents(meetingId);
    this.flushChats(meetingId);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ── Private Helpers ───────────────────────────────────────

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      // Flush all event queues
      for (const meetingId of this.eventQueues.keys()) {
        this.flushEvents(meetingId);
      }
      // Flush all chat queues
      for (const meetingId of this.chatQueues.keys()) {
        this.flushChats(meetingId);
      }
    }, EVENT_BATCH_INTERVAL_MS);
  }

  private async post(path: string, data: any): Promise<any> {
    return this.request('POST', path, data);
  }

  private async patch(path: string, data: any): Promise<any> {
    return this.request('PATCH', path, data);
  }

  private async request(
    method: string,
    path: string,
    data?: any,
    retries = 3
  ): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${BACKEND_URL}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        this.isOnline = true;
        return response.json();
      } catch (error) {
        console.warn(
          `[ApiService] Request failed (attempt ${attempt}/${retries}):`,
          error
        );

        if (attempt === retries) {
          this.isOnline = false;
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
}

export const apiService = new ApiService();
