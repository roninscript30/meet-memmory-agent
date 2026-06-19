import { Request, Response } from 'express';
import { meetingService } from '../services/meeting.service';
import { CreateMeetingBody, UpdateMeetingBody } from '../types';

export class MeetingController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as CreateMeetingBody;
      console.log(`[MEETING] Creating meeting: ${body.meetingId} (${body.title})`);
      const meeting = await meetingService.create(body);
      res.status(201).json({ success: true, data: meeting });
    } catch (error: any) {
      if (error.code === 11000) {
        console.log(`[MEETING] Meeting already exists, returning existing: ${req.body.meetingId}`);
        const existing = await meetingService.findByMeetingId(req.body.meetingId);
        res.status(200).json({ success: true, data: existing });
        return;
      }
      console.error(`[MEETING] Failed to create meeting: ${error.message}`);
      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const body = req.body as UpdateMeetingBody;
    console.log(`[MEETING] Updating meeting: ${id} with status: ${body.status}`);
    const meeting = await meetingService.update(id, body);

    if (!meeting) {
      console.warn(`[MEETING] Update failed. Meeting not found: ${id}`);
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    res.json({ success: true, data: meeting });
  }

  async findAll(_req: Request, res: Response): Promise<void> {
    console.log('[MEETING] Fetching all meetings');
    const meetings = await meetingService.findAll();
    res.json({ success: true, data: meetings, count: meetings.length });
  }

  async findById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    console.log(`[MEETING] Fetching meeting details for: ${id}`);
    const meeting = await meetingService.findByMeetingIdFull(id);

    if (!meeting) {
      console.warn(`[MEETING] Meeting not found: ${id}`);
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    res.json({ success: true, data: meeting });
  }
}

export const meetingController = new MeetingController();
