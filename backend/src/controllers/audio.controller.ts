import { Request, Response } from 'express';
import { audioService } from '../services/audio.service';

export class AudioController {
  async uploadChunk(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    if (!req.file) {
      console.warn(`[UPLOAD] Failed upload chunk for meeting ${id}: No audio file provided`);
      res.status(400).json({ success: false, error: 'No audio file provided' });
      return;
    }

    const chunkIndex = parseInt(req.body.chunkIndex, 10);
    const duration = parseFloat(req.body.duration) || 30;
    const timestamp = req.body.timestamp || new Date().toISOString();

    if (isNaN(chunkIndex)) {
      console.warn(`[UPLOAD] Failed upload chunk for meeting ${id}: chunkIndex is required`);
      res.status(400).json({ success: false, error: 'chunkIndex is required' });
      return;
    }

    console.log(`[UPLOAD] Saving audio chunk ${chunkIndex} for meeting ${id} (Size: ${req.file.size} bytes)`);

    const chunk = await audioService.saveChunk({
      meetingId: id,
      chunkIndex,
      filePath: req.file.path,
      duration,
      size: req.file.size,
      mimeType: req.file.mimetype || 'audio/webm',
      timestamp,
    });

    console.log(`[AUDIO] Chunk ${chunkIndex} successfully stored in DB for meeting ${id}`);
    res.status(201).json({ success: true, data: chunk });
  }

  async findByMeeting(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    console.log(`[AUDIO] Fetching all audio chunks for meeting: ${id}`);
    const chunks = await audioService.findByMeeting(id);
    res.json({ success: true, data: chunks, count: chunks.length });
  }
}

export const audioController = new AudioController();
