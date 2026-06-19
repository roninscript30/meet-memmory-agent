import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { BatchEventsBody } from '../types';

export class EventController {
  async createBatch(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { events } = req.body as BatchEventsBody;

    if (!events || !Array.isArray(events) || events.length === 0) {
      console.warn(`[EVENT] Batch insert rejected for meeting ${id}: Empty or invalid events array`);
      res.status(400).json({ success: false, error: 'events array is required' });
      return;
    }

    console.log(`[EVENT] Processing batch of ${events.length} events for meeting ${id}`);
    const created = await eventService.createBatch(id, events);
    res.status(201).json({ success: true, data: created, count: created.length });
  }

  async findByMeeting(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const type = req.query.type as string | undefined;

    if (type) {
      console.log(`[EVENT] Fetching events of type '${type}' for meeting: ${id}`);
    } else {
      console.log(`[EVENT] Fetching all events for meeting: ${id}`);
    }

    const events = type
      ? await eventService.findByMeetingAndType(id, type)
      : await eventService.findByMeeting(id);

    res.json({ success: true, data: events, count: events.length });
  }
}

export const eventController = new EventController();
