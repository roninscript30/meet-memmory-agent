# Meet Scraper — AI Meeting Companion (Data Collection Layer)

Privacy-first meeting intelligence platform. Automatically captures meeting data from Google Meet and Zoho Meeting and stores it in MongoDB for future AI processing.

## Architecture

```
Google Meet / Zoho Meeting
         ↓
  Browser Extension (Plasmo + MV3)
    ├── Content Script (DOM scraping + MutationObservers)
    ├── Background Service Worker (orchestration)
    └── Offscreen Document (audio capture)
         ↓
  Node.js Backend (Express + TypeScript)
         ↓
  MongoDB (meetings, participants, events, chats, audio_chunks)
```

## What Gets Captured

| Data | Method |
|------|--------|
| Meeting title, URL, ID | DOM scraping |
| Participants (join/leave) | MutationObserver + polling |
| Chat messages | MutationObserver |
| Active speaker changes | MutationObserver + computed styles |
| Screen sharing events | Polling |
| Meeting audio + microphone | chrome.tabCapture + Web Audio API |

## Prerequisites

- Node.js 18+
- MongoDB running locally on port 27017
- Chrome browser

## Quick Start

### 1. Start MongoDB

```bash
mongod --dbpath /path/to/data
```

### 2. Start Backend

```bash
cd backend
npm install
npm run dev
```

Server starts on http://localhost:3001

### 3. Build Extension

```bash
cd extension
npm install
npm run dev
```

### 4. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/build/chrome-mv3-dev`

### 5. Use It

1. Click the extension icon
2. Click **Enable Capture**
3. Join a Google Meet or Zoho Meeting
4. Data is automatically collected and stored

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/meetings` | Create meeting |
| `PATCH` | `/api/meetings/:id` | Update meeting |
| `GET` | `/api/meetings` | List meetings |
| `GET` | `/api/meetings/:id` | Get meeting (full data) |
| `POST` | `/api/meetings/:id/participants` | Add participant |
| `PATCH` | `/api/meetings/:id/participants/:name` | Mark participant left |
| `POST` | `/api/meetings/:id/events` | Batch insert events |
| `POST` | `/api/meetings/:id/chats` | Batch insert chats |
| `POST` | `/api/meetings/:id/audio-chunks` | Upload audio chunk |

## Project Structure

```
MEET-SCRAPER/
├── backend/           # Express + TypeScript + Mongoose
│   └── src/
│       ├── config/    # DB connection, env vars
│       ├── models/    # Mongoose schemas
│       ├── services/  # Business logic
│       ├── controllers/ # Request handlers
│       ├── routes/    # API routes
│       └── middleware/ # Error handling, validation
├── extension/         # Plasmo Chrome Extension
│   └── src/
│       ├── adapters/  # Platform-specific DOM adapters
│       ├── observers/ # MutationObserver implementations
│       ├── services/  # API client, storage
│       ├── core/      # Types, constants, event bus
│       └── contents/  # Content scripts
└── README.md
```

## Tech Stack

- **Extension**: Chrome MV3, Plasmo, React, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB, Mongoose
- **Audio**: chrome.tabCapture, Web Audio API, MediaRecorder
