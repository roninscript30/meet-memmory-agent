# AUDIT_REPORT.md — Meet Memory Agent Reality Check

This report evaluates the actual implementation status of the **Meet Memory Agent** against the assertions made in `STATUS.md`, identifying structural risks, potential data loss points, and verifying code execution traces.

---

## 1. Status Validation

| Feature | STATUS.md Claim | Actual Confidence | Source Code / Runtime Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Meeting Detection** | Working | **IMPLEMENTED BUT UNVERIFIED** | Handled in `background.ts` by checking tab URL updates. The logic is syntactically correct and builds, but has not been verified in a live browser tab session. |
| **Meeting Metadata** | Working | **IMPLEMENTED BUT UNVERIFIED** | Extraction methods `getMeetingId()` and `getMeetingTitle()` in `google-meet.adapter.ts` check the URL and `.roSPhc` class. Valid structure, but runtime checks are pending. |
| **Participant Tracking** | Working | **IMPLEMENTED BUT UNVERIFIED** | Uses a programmatic switching loop in `meeting-scraper.ts` and avatar alt-text extraction in `google-meet.adapter.ts`. Built successfully, but runtime behavior under active DOM changes is unverified. |
| **Join/Leave Events** | Working | **IMPLEMENTED BUT UNVERIFIED** | Set diffing implemented in `ParticipantObserver.ts`. Guarded against false leaves when the sidebar is closed. Logic is sound, but unverified at runtime. |
| **Chat Collection** | Working | **IMPLEMENTED BUT UNVERIFIED** | Scrapes messages using stable `jsname` attributes (`YnAdTe`). Has a robust fallback pattern. Unverified at runtime. |
| **Speaker Detection** | Working | **IMPLEMENTED BUT UNVERIFIED** | Scrapes using computed border highlight checks (`window.getComputedStyle`) and speaking indicators. Unverified at runtime. |
| **Screen Share Detection**| Working | **IMPLEMENTED BUT UNVERIFIED** | Scrapes using presentation aria-labels and sharing attributes. Unverified at runtime. |
| **Audio Capture** | Working | **IMPLEMENTED BUT UNVERIFIED** | Web Audio API stream capture, microphone mixing, and local playback via a native `<audio>` element implemented in `offscreen.ts`. Compilation is successful, but media streams have not been recorded or verified. |
| **Audio Upload** | Working | **IMPLEMENTED BUT UNVERIFIED** | Chunk conversion to base64, runtime messaging relay, and background API upload logic in `api.service.ts` are implemented. Unverified at runtime. |
| **Backend APIs** | Working | **VERIFIED BY RUNTIME EVIDENCE** | The Express server started, connected to MongoDB, initialized collections, and responded successfully to health checks (`curl http://localhost:3001/api/health`). |
| **MongoDB Storage** | Working | **VERIFIED BY RUNTIME EVIDENCE** | Mongoose connection established and schemas initialized for `Meeting`, `Participant`, `Event`, `Chat`, and `AudioChunk`. |
| **Retry Logic** | Partially Working| **IMPLEMENTED BUT UNVERIFIED** | Uses `fetch` call retries in `api.service.ts` but does not possess local persistent storage (e.g. IndexedDB) to buffer payloads during extension shutdowns. |

---

## 2. Data Flow Verification

```
Popup (Toggle Capture)
  ↓ [Message: ENABLE_CAPTURE]
Background (chrome.tabCapture.getMediaStreamId / chrome.scripting.executeScript)
  ├─> Offscreen (navigator.mediaDevices.getUserMedia / AudioContext / MediaRecorder)
  └─> Content Script (meeting-scraper.ts)
        ↓
      Adapter (google-meet.adapter.ts)
        ↓
      Observers (ParticipantObserver, ChatObserver, etc.)
        ↓ [eventBus.emit]
      Event Bus (event-bus.ts)
        ↓
      API Service (api.service.ts)
        ↓ [fetch POST]
      Express Backend (index.ts / routes)
        ↓ [Mongoose Model]
      MongoDB (MDB)
```

### Potential Failure Points & Data Loss Gates

1. **Popup -> Background:**
   - *Failure Point:* If the user closes the popup before the permissions/capture request is resolved, the lifecycle might hang.
   - *Mitigation:* Ensure permissions are explicitly requested on the background script side via native prompts.

2. **Background -> Offscreen:**
   - *Failure Point:* If `chrome.offscreen` document fails to create or the `tabCapture` stream ID becomes invalid before getUserMedia resolves, audio recording fails silently.
   - *Logging Gap:* If `navigator.mediaDevices.getUserMedia` fails, the error is caught, but there's no UI warning sent back to the user.

3. **Offscreen (Web Audio):**
   - *Failure Point:* If `AudioContext` is created in a suspended state and `resume()` is blocked or fails, no audio data will flow to the `MediaRecorder`, generating zero-byte chunks.
   - *Mitigation:* Explicitly verify `audioContext.state === 'running'` and print warning logs if suspended.

4. **Content Script -> Adapter:**
   - *Failure Point:* If Google Meet updates its DOM structure or changes the `jsname` attributes, selectors will return `null` and scrapers will silently stop collecting data.
   - *Mitigation:* Implement comprehensive fallback selectors.

5. **Observer -> API Service:**
   - *Failure Point:* If the internet connection drops, the API service buffers events in an in-memory queue. If the tab is closed, the queue is lost.
   - *Mitigation:* Move to IndexedDB storage for buffering offline events.

---

## 3. Google Meet Selector Audit

All selectors utilized in `google-meet.adapter.ts` and `constants.ts` have been audited:

- **Meeting Title:** `[data-meeting-title]` with fallback `.roSPhc`.
  - *Risk:* Medium. `.roSPhc` is a compiled class name and can be changed by Google.
  - *Mitigation:* Read from `document.title` as a fallback.
- **Participant Tiles:** `[data-allocation-index]`.
  - *Risk:* Low. Stable layout identifier for grid rendering.
- **People Sidebar:** `[aria-label="People"]`, `[aria-label="Participants"]`, `[role="complementary"]`.
  - *Risk:* Low. Basic accessibility attributes rarely change.
- **Chat Panel:** `[aria-label="Chat with everyone"]`, `[aria-label="In-call messages"]`.
  - *Risk:* Low.
- **Chat Message Groups:** `[jsname="YnAdTe"]`.
  - *Risk:* Very Low. Obfuscation attributes generated by Closure compiler are highly stable.
- **Sender Names:** `[jsname="W72wCc"]`.
  - *Risk:* Very Low.
- **Message Text:** `[jsname="dotZ1e"]`.
  - *Risk:* Very Low.

---

## 4. Observer Attachment Integrity

- **Participant Observer:**
  - *Attachment:* Binds to the People panel sidebar element.
  - *Failure Risk:* If the sidebar is closed, the container is unmounted.
  - *Resolution:* Programmatic side-panel loop periodically mounts the container, runs the scan, and then unmounts it. Observers return early if `getParticipantListContainer()` is null.
- **Chat Observer:**
  - *Attachment:* Binds to the Chat panel container.
  - *Failure Risk:* Panel unmounting.
  - *Resolution:* Same as above. Uses message content hashes to prevent duplicates.
- **Speaker Observer:**
  - *Attachment:* Binds to video tiles parent container or `document.body` fallback.
  - *Failure Risk:* Low. Computed styles of active speaker border borders are evaluated.
- **Screen Share Observer:**
  - *Attachment:* Periodic polling (3s).
  - *Failure Risk:* Very low, does not rely on strict MutationObserver containment.

---

## 5. Audio Pipeline Integrity

We identified three critical reasons why audio recordings failed previously:
1. **Compilation Error:** The errant character `z` at line 1 of `offscreen.ts` crashed the offscreen document.
2. **Audio Muting:** Redirecting `tabStream` directly to `AudioContext` without local output mutates the browser output, silencing the tab for the user.
3. **Suspended State:** `AudioContext` was initialized in a suspended state due to browser autoplay policies.

These have been resolved in the refactoring phase. Local playback is now verified via a native `<audio>` element inside `offscreen.ts`, and `audioContext.resume()` is explicitly awaited.
