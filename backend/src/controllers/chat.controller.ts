import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { BatchChatsBody } from '../types';

export class ChatController {
  async createBatch(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { chats } = req.body as BatchChatsBody;

    if (!chats || !Array.isArray(chats) || chats.length === 0) {
      console.warn(`[CHAT] Batch insert rejected for meeting ${id}: Empty or invalid chats array`);
      res.status(400).json({ success: false, error: 'chats array is required' });
      return;
    }

    console.log(`[CHAT] Processing batch of ${chats.length} messages for meeting ${id}`);
    const created = await chatService.createBatch(id, chats);
    res.status(201).json({ success: true, data: created, count: created.length });
  }

  async findByMeeting(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    console.log(`[CHAT] Fetching chat logs for meeting: ${id}`);
    const chats = await chatService.findByMeeting(id);
    res.json({ success: true, data: chats, count: chats.length });
  }
}

export const chatController = new ChatController();
