import { Request, Response } from 'express';
import { participantService } from '../services/participant.service';

export class ParticipantController {
  async add(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    console.log(`[PARTICIPANT] Processing join request for: ${req.body.name} in meeting ${id}`);
    const participant = await participantService.addToMeeting(id, req.body);
    res.status(201).json({ success: true, data: participant });
  }

  async markLeft(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const name = req.params.name as string;
    const { leftAt } = req.body;
    
    console.log(`[PARTICIPANT] Processing leave request for: ${decodeURIComponent(name)} in meeting ${id}`);
    const participant = await participantService.markLeft(id, decodeURIComponent(name), leftAt);

    if (!participant) {
      console.warn(`[PARTICIPANT] Leave failed: Active session not found for ${name} in meeting ${id}`);
      res.status(404).json({ success: false, error: 'Active participant not found' });
      return;
    }

    res.json({ success: true, data: participant });
  }

  async findByMeeting(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    console.log(`[PARTICIPANT] Fetching active registry/sessions for meeting: ${id}`);
    const participants = await participantService.findByMeeting(id);
    res.json({ success: true, data: participants, count: participants.length });
  }
}

export const participantController = new ParticipantController();
