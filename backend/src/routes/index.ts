import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { env } from '../config/env';
import { meetingController } from '../controllers/meeting.controller';
import { participantController } from '../controllers/participant.controller';
import { eventController } from '../controllers/event.controller';
import { chatController } from '../controllers/chat.controller';
import { audioController } from '../controllers/audio.controller';
import { validateBody } from '../middleware/validate';

const router = Router();

// ── Multer config for audio uploads ─────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// ── Helper to wrap async controllers ────────────────────────
function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ── Meetings ────────────────────────────────────────────────
router.post(
  '/meetings',
  validateBody(['meetingId', 'platform', 'url', 'startedAt']),
  asyncHandler(meetingController.create.bind(meetingController))
);

router.patch(
  '/meetings/:id',
  asyncHandler(meetingController.update.bind(meetingController))
);

router.get(
  '/meetings',
  asyncHandler(meetingController.findAll.bind(meetingController))
);

router.get(
  '/meetings/:id',
  asyncHandler(meetingController.findById.bind(meetingController))
);

// ── Participants ────────────────────────────────────────────
router.post(
  '/meetings/:id/participants',
  validateBody(['name', 'joinedAt']),
  asyncHandler(participantController.add.bind(participantController))
);

router.patch(
  '/meetings/:id/participants/:name',
  validateBody(['leftAt']),
  asyncHandler(participantController.markLeft.bind(participantController))
);

router.get(
  '/meetings/:id/participants',
  asyncHandler(participantController.findByMeeting.bind(participantController))
);

// ── Events ──────────────────────────────────────────────────
router.post(
  '/meetings/:id/events',
  asyncHandler(eventController.createBatch.bind(eventController))
);

router.get(
  '/meetings/:id/events',
  asyncHandler(eventController.findByMeeting.bind(eventController))
);

// ── Chats ───────────────────────────────────────────────────
router.post(
  '/meetings/:id/chats',
  asyncHandler(chatController.createBatch.bind(chatController))
);

router.get(
  '/meetings/:id/chats',
  asyncHandler(chatController.findByMeeting.bind(chatController))
);

// ── Audio Chunks ────────────────────────────────────────────
router.post(
  '/meetings/:id/audio-chunks',
  upload.single('audio'),
  asyncHandler(audioController.uploadChunk.bind(audioController))
);

router.get(
  '/meetings/:id/audio-chunks',
  asyncHandler(audioController.findByMeeting.bind(audioController))
);

// ── Health Check ────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
