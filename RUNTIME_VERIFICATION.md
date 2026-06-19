# RUNTIME_VERIFICATION.md — Meet Memory Agent Verification Protocol

This document details the checklist, expected log outputs, and verification checks required to transition features from **IMPLEMENTED BUT UNVERIFIED** to **VERIFIED BY RUNTIME EVIDENCE**.

---

## Runtime Verification Checklist

- [ ] **Meeting Detection**
  - *Verification Steps:* Navigate to `https://meet.google.com/xyz-pdq-abc`. Verify that the extension badge changes or background script prints initiation logs.
  - *Expected logs (Background):*
    ```
    [BACKGROUND] Tab URL updated: https://meet.google.com/xyz-pdq-abc
    [BACKGROUND] Detected active Google Meet session. Initiating scraper...
    ```
  - *Evidence:* Meeting record created in MongoDB.

- [ ] **Participant Tracking**
  - *Verification Steps:* Join a meeting and open/close the participants list, or let the programmatic panel toggler cycle through the views.
  - *Expected logs (Scraper console):*
    ```
    [SCRAPER] Coordinated Panel Toggle: Swapping to People panel to scan participants
    [PARTICIPANTS] MutationObserver attached to container
    [PARTICIPANTS] Joined: John Doe
    [SCRAPER] Coordinated Panel Toggle: Swapping back to Chat panel
    ```
  - *Evidence:* Verify participant names are populated in MongoDB `participants` collection:
    ```javascript
    db.participants.find({ meetingId: "xyz-pdq-abc" })
    ```

- [ ] **Chat Collection**
  - *Verification Steps:* Type a message in the Google Meet chat.
  - *Expected logs (Scraper console):*
    ```
    [CHAT] MutationObserver attached to container
    [CHAT] New message from Jane Smith: Hello everyone!
    ```
  - *Evidence:* Message saved in MongoDB `chats` collection:
    ```javascript
    db.chats.find({ sender: "Jane Smith" })
    ```

- [ ] **Speaker Detection**
  - *Verification Steps:* Speak or let another participant speak.
  - *Expected logs (Scraper console):*
    ```
    [SPEAKER] Speaker changed: null → John Doe
    [SPEAKER] Speaker changed: John Doe → Jane Smith
    ```
  - *Evidence:* Events logged in MongoDB `events` collection:
    ```javascript
    db.events.find({ type: "speaker_changed" })
    ```

- [ ] **Screen Share Detection**
  - *Verification Steps:* Initiate screen sharing.
  - *Expected logs (Scraper console):*
    ```
    [SCREENSHARE] Screen share started by John Doe
    [SCREENSHARE] Screen share stopped
    ```
  - *Evidence:* Verify events in MongoDB:
    ```javascript
    db.events.find({ type: { $regex: /screen_share/ } })
    ```

- [ ] **Audio Capture**
  - *Verification Steps:* Enable capture and record for at least 30 seconds.
  - *Expected logs (Offscreen document / Background):*
    ```
    [AUDIO] Starting audio capture with streamId: tab-capture-id
    [AUDIO] Tab audio stream captured successfully
    [AUDIO] AudioContext created. Current state: running
    [AUDIO] Local playback element attached for tab audio
    [AUDIO] Recording started (30s chunks)
    [AUDIO] Captured chunk: 145280 bytes, type: audio/webm;codecs=opus
    ```
  - *Evidence:* Zero-byte chunks are prevented. Verify file sizes are greater than 0 bytes.

- [ ] **Audio Upload & Storage**
  - *Verification Steps:* Let the recording run for 1 minute (2 chunks) and stop the meeting.
  - *Expected logs (Background / API / Backend):*
    ```
    [BACKGROUND] Received audio chunk from offscreen
    [API] Uploading audio chunk 1 for meeting xyz-pdq-abc (size: 145280 bytes)
    [BACKEND] POST /api/audio/upload - 200 OK
    ```
  - *Evidence:* Query the `audiochunks` collection in MongoDB:
    ```javascript
    db.audiochunks.find()
    ```
    Verify files exist in the backend `backend/uploads/` directory.

---

## Verification Shell Commands

Run these queries in MongoDB to verify that data is populating:

### 1. Check Active Meetings
```bash
mongosh mongodb://localhost:27017/meet-scraper --eval "db.meetings.find().pretty()"
```

### 2. Verify Structured Meeting Events
```bash
mongosh mongodb://localhost:27017/meet-scraper --eval "db.events.find().sort({ timestamp: 1 }).pretty()"
```

### 3. Verify Audio Chunks Captured
```bash
mongosh mongodb://localhost:27017/meet-scraper --eval "db.audiochunks.find({}, { binaryData: 0 }).pretty()"
```
