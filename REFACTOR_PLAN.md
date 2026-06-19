# REFACTOR_PLAN.md — Meet Memory Agent Refactoring Strategy

This document details the refactoring roadmap to transition the system to production-grade stability, covering completed immediate fixes and future reliability enhancements.

---

## 1. Immediate Fixes (Completed)

These issues were resolved in the June 2026 refactoring session to unblock basic system operations:

- **Syntax Error Cleanups:**
  - *Details:* Removed compilation-blocking syntax error (`z` character) at line 1 of `offscreen.ts`.
  - *Effort:* Completed (0.5 hours).

- **Audio Playback Restoration:**
  - *Details:* Integrated native `<audio>` element with tabStream routing in `offscreen.ts` to prevent tab muting during sessions. Awaited `audioContext.resume()` explicitly to handle suspended status.
  - *Effort:* Completed (2 hours).

- **Scraper Target Relocation & Selection Resilience:**
  - *Details:* Refactored selectors in `constants.ts` to target Google Closure compiler `jsname` attributes (`YnAdTe` for messages, `W72wCc` for senders, `dotZ1e` for text).
  - *Effort:* Completed (2 hours).

- **Programmatic Sidebar Toggling & Observer Protection:**
  - *Details:* Implemented central 10-second panel-switching loop in `meeting-scraper.ts` to keep DOM nodes mounted off-screen. Protected `ParticipantObserver` from generating false leave events when the container is unmounted.
  - *Effort:* Completed (3 hours).

---

## 2. Short-Term Enhancements (Planned)

- **IndexedDB Event Buffering:**
  - *Goal:* Replace the volatile in-memory queue in `api.service.ts` with local browser storage (IndexedDB) to buffer events during connection outages or accidental browser closes.
  - *Estimated Effort:* 4 hours.
  - *Priority:* P1.

- **Audio Recording Chunk Resumption:**
  - *Goal:* Safely catch media recorder pause/error events and recreate the offscreen context dynamically to avoid recording deadlocks.
  - *Estimated Effort:* 3 hours.
  - *Priority:* P1.

---

## 3. Medium-Term Enhancements (Planned)

- **Backend Audio Chunk Stitching:**
  - *Goal:* Implement a backend service worker using ffmpeg/fluent-ffmpeg that merges the 30-second WebM audio chunks into a single, cohesive meeting audio file upon the receipt of `meeting_ended`.
  - *Estimated Effort:* 6 hours.
  - *Priority:* P2.

- **Dynamic Adapter Selection:**
  - *Goal:* Refactor adapter instantiation in `meeting-scraper.ts` to dynamically load target selectors for different platforms (e.g. Google Meet, Zoho Meeting) using a factory pattern.
  - *Estimated Effort:* 4 hours.
  - *Priority:* P2.

---

## 4. Long-Term Enhancements (Planned)

- **AI Transcription Pipeline:**
  - *Goal:* Hook backend storage events to an AI transcription engine (such as Whisper or Google Cloud Speech-to-Text) to auto-generate session summaries and structured text outputs.
  - *Estimated Effort:* 12 hours.
  - *Priority:* P3.
