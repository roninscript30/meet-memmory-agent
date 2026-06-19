# PASSIVE_SCRAPER_REFACTOR.md — Passive Scraper Architecture Specification

This document details the transition of the **Meet Memory Agent** from an active layout-modifying and clicking scraper to a completely **Passive Observer Architecture**.

---

## 1. DOM Modifications to Remove

The following DOM modifications have been identified in the codebase and will be removed:

| File | Line(s) | Purpose | Risk | Replacement Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `google-meet.adapter.ts` | 276-304 | Injects a CSS stylesheet (`style` element) to push sidebar panels offscreen via `left: -9999px`. | High. Modifies Google Meet's layout, potentially breaking native responsive flex states, rendering panels unresponsive, or violating Content Security Policy (CSP). | **Remove entirely.** Do not inject any CSS styles. |
| `google-meet.adapter.ts` | 306-311 | Removes the injected stylesheet during shutdown. | Low. Cleanup code. | **Remove entirely.** |
| `google-meet.adapter.ts` | 313-329 | Simulates a `.click()` event on the People panel icon to force-open the sidebar. | High. Interferes with the user's manual navigation and active panel view. | **Remove entirely.** Only scan elements if the user opens the panel. |
| `google-meet.adapter.ts` | 331-346 | Simulates a `.click()` event on the Chat panel icon. | High. Prevents the user from closing chat or manually controlling sidebar states. | **Remove entirely.** |
| `google-meet.adapter.ts` | 348-356 | Simulates a `.click()` event on the close button to close panels. | High. Forces panel closure against user intent. | **Remove entirely.** |
| `meeting-scraper.ts` | 178-202 | Runs the programmatic panel-switching loop (`panelToggleInterval`) that periodically triggers clicks. | High. Causes constant flickering, panel switching, and unresponsiveness in the native UI. | **Remove entirely.** Replace with a passive discovery daemon. |

---

## 2. New Passive Scraper Architecture

The scraper now operates as a **Passive Observer** that does not execute mutations or control clicks on the host DOM.

```
                   ┌────────────────────────────────────────┐
                   │    Google Meet DOM (Untouched by Ext)   │
                   └────────────────────────────────────────┘
                       │                                │
      (If User Manually Opens Sidebar)       (Always Rendered in Grid View)
                       ▼                                ▼
            ┌─────────────────────┐          ┌─────────────────────┐
            │   Sidebar Panels    │          │  Video Grid Tiles   │
            │  (People & Chat)    │          │  & Speaking Badges  │
            └─────────────────────┘          └─────────────────────┘
                       │                                │
                       └───────────────┬────────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │   DOM Discovery Engine    │
                         │ (Continuous Bind Poller)  │
                         └───────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
          ┌──────────────────┐  ┌─────────────┐  ┌──────────────────┐
          │ Participant Obs  │  │  Chat Obs   │  │   Speaker Obs    │
          │  (Registry &     │  │ (Dynamic    │  │ (Computed Style/ │
          │   Diff Engine)   │  │  Re-binder) │  │  Speaking Badge) │
          └──────────────────┘  └─────────────┘  └──────────────────┘
```

---

## 3. Component Observation Strategies

### A. Passive Participant Discovery
Instead of forcing the People panel to mount, we scrape participant names from two distinct sources:
1. **The People Sidebar:** Read ground-truth participant listitems *only* if the sidebar is currently open.
2. **Video Grid Tiles:** Passively scan visible video elements (`[data-allocation-index]`) for participant names.

#### Registry and Diff Engine Logic
The `ParticipantObserver` maintains a stateful `ParticipantRegistry`:
- **Join Rule:** Any participant name found in the video grid tiles or the People sidebar is added to the registry, and a `participant_joined` event is emitted.
- **Leave Rule:** 
  - If the People sidebar is **open**: Perform a full diff of the sidebar names against the registry. If a registered participant is missing from the sidebar, emit `participant_left` and remove them from the registry.
  - If the People sidebar is **closed**: **Do not** process leave events based on missing video tiles, as tiles are dynamically paged out. This ensures 100% leave event accuracy.

### B. Passive Chat Discovery
The `ChatObserver` works dynamically without force-opening the panel:
- A discovery poller checks if the Chat panel container is mounted.
- If the Chat panel is mounted (opened manually by the user), the observer binds a `MutationObserver` to it and scans new message blocks.
- If the Chat panel is unmounted (closed manually by the user), the observer disconnects.

### C. Passive Screen Share Detection
Screen sharing is detected by scanning for presentation tile attributes (`[data-is-screen-sharing="true"]` or `[aria-label*="presenting"]`) inside the video grid, running entirely independent of sidebar panel states.

### D. Passive Speaker Detection
Tracks active speakers by observing border outlines or specific "speaking" status icons on the grid tiles.

---

## 4. Verification Checklist

- [ ] Verify that starting the scraper injects no stylesheets.
- [ ] Verify that Google Meet panels open and close natively under manual user control with zero lag or interference.
- [ ] Verify that manually opening the People panel synchronizes all current participant names.
- [ ] Verify that video tiles trigger join events for participants as they appear.
- [ ] Verify that leaving a meeting triggers leave events correctly when the People panel is open.
- [ ] Verify that messages typed in the chat are collected only when the chat sidebar is open, without breaking panel focus.
