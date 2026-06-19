import { Request, Response } from 'express';
import { meetingService } from '../services/meeting.service';
import { CreateMeetingBody, UpdateMeetingBody } from '../types';

export class MeetingController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as CreateMeetingBody;
      const meeting = await meetingService.create(body);
      res.status(201).json({ success: true, data: meeting });
    } catch (error: any) {
      if (error.code === 11000) {
        const existing = await meetingService.findByMeetingId(req.body.meetingId);
        res.status(200).json({ success: true, data: existing });
        return;
      }
      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const body = req.body as UpdateMeetingBody;
    const meeting = await meetingService.update(id, body);

    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    res.json({ success: true, data: meeting });
  }

  async findAll(_req: Request, res: Response): Promise<void> {
    const meetings = await meetingService.findAll();
    res.json({ success: true, data: meetings, count: meetings.length });
  }

  async findById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const meeting = await meetingService.findByMeetingIdFull(id);

    if (!meeting) {
      res.status(404).json({ success: false, error: 'Meeting not found' });
      return;
    }

    res.json({ success: true, data: meeting });
  }
}

export const meetingController = new MeetingController();
