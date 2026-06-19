# Verification Checklist — Stabilization Refactor

Use this checklist to verify that all stabilization refactoring changes have been correctly implemented.

---

## 1. Extension Compilation
- [ ] Run `npm run build` inside `extension/`.
- **Expected Results:** Compiles with zero errors and outputs the final artifact.

---

## 2. Server Startup & Migrations
- [ ] Start the backend server (`npm run dev` or equivalent).
- **Expected Console Logs:**
  ```
  [MONGODB] Connection established successfully to: mongodb://localhost:27017/meet-scraper
  [MONGODB] Checking for database migrations...
  [MONGODB] No legacy participant sessions required migration
  [MONGODB] Migration checks completed successfully
  ```

---

## 3. Passive Participant Discovery
- [ ] Open a Google Meet room.
- [ ] Enable extension capture.
- [ ] Manually open and close the People panel.
- **Expected Console Logs:**
  - When panel is open: `[PARTICIPANTS] Joined (Sidebar): Name`
  - When panel is closed: `[PARTICIPANTS] Joined (Grid Tile): Name`
- **Expected MongoDB Document (Collection: `participants`):**
  ```json
  {
    "_id": "ObjectId(...)",
    "name": "Marudhu",
    "createdAt": "..."
  }
  ```
- **Expected MongoDB Document (Collection: `participantsessions`):**
  ```json
  {
    "_id": "ObjectId(...)",
    "meeting": "ObjectId(...)",
    "meetingId": "qim-fkeb-nvr",
    "participant": "ObjectId(...)",
    "name": "Marudhu",
    "joinedAt": "...",
    "leftAt": "...",
    "duration": 120
  }
  ```

---

## 4. Chat Message Deduplication
- [ ] Send messages in chat.
- [ ] Stop and restart capture to force batch resend.
- **Expected Console Logs:**
  - On new messages: `[CHAT] Message saved from Name: "Hello..."`
  - On duplicates: `[CHAT] Skipping duplicate message from batch: Name`
- **Expected MongoDB Document (Collection: `chats`):**
  ```json
  {
    "_id": "ObjectId(...)",
    "meeting": "ObjectId(...)",
    "meetingId": "qim-fkeb-nvr",
    "sender": "Rahul",
    "senderRef": "ObjectId(...)",
    "message": "Hello Team",
    "timestamp": "..."
  }
  ```

---

## 5. Speaker Timeline
- [ ] Talk during a meeting to trigger speaker events.
- **Expected Console Logs:**
  - On speaker change: `[SPEAKER] Timeline closed for Name. Duration: 12s`
- **Expected MongoDB Document (Collection: `events`):**
  ```json
  {
    "_id": "ObjectId(...)",
    "meeting": "ObjectId(...)",
    "meetingId": "qim-fkeb-nvr",
    "type": "speaker_changed",
    "speaker": "Marudhu",
    "timestamp": "...",
    "endedAt": "...",
    "duration": 12
  }
  ```

---

## 6. Structured Audio Uploads
- [ ] Let audio chunks upload automatically.
- **Expected Folder Path Structure:**
  `uploads/google-meet/2026/06/meeting-qim-fkeb-nvr/chunk-0000.webm`
  `uploads/google-meet/2026/06/meeting-qim-fkeb-nvr/chunk-0001.webm`
- **Expected Console Logs:**
  ```
  [UPLOAD] Saving audio chunk 0 for meeting qim-fkeb-nvr (Size: 45210 bytes)
  [AUDIO] Target filename resolved: chunk-0000.webm
  [AUDIO] Chunk 0 successfully stored in DB for meeting qim-fkeb-nvr
  ```
- **Expected MongoDB Document (Collection: `audiochunks`):**
  ```json
  {
    "_id": "ObjectId(...)",
    "meeting": "ObjectId(...)",
    "meetingId": "qim-fkeb-nvr",
    "chunkIndex": 0,
    "filePath": "uploads/google-meet/2026/06/meeting-qim-fkeb-nvr/chunk-0000.webm",
    "duration": 30,
    "size": 45210,
    "mimeType": "audio/webm",
    "timestamp": "..."
  }
  ```
