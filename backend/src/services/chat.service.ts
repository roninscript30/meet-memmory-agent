import { Chat } from '../models/chat.model';
import { Meeting } from '../models/meeting.model';
import { Participant } from '../models/participant.model';
import { CreateChatBody } from '../types';

export class ChatService {
  async create(meetingId: string, data: CreateChatBody) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`[CHAT] Meeting not found: ${meetingId}`);
    }

    const msgDate = new Date(data.timestamp);
    const minTime = new Date(msgDate.getTime() - 1000);
    const maxTime = new Date(msgDate.getTime() + 1000);

    // Deduplicate
    const existing = await Chat.findOne({
      meetingId,
      sender: data.sender,
      message: data.message,
      timestamp: { $gte: minTime, $lte: maxTime },
    });

    if (existing) {
      console.log(`[CHAT] Skipping duplicate message from ${data.sender}`);
      return existing;
    }

    // Resolve Participant reference
    let participantDoc = await Participant.findOne({ name: data.sender });
    if (!participantDoc) {
      participantDoc = new Participant({ name: data.sender });
      await participantDoc.save();
    }

    const chat = new Chat({
      meeting: meetingDoc._id,
      meetingId,
      sender: data.sender,
      senderRef: participantDoc._id,
      message: data.message,
      timestamp: msgDate,
    });
    console.log(`[CHAT] Saved message from ${data.sender}`);
    return chat.save();
  }

  async createBatch(meetingId: string, chats: CreateChatBody[]) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`[CHAT] Meeting not found: ${meetingId}`);
    }

    const insertedDocs = [];

    for (const c of chats) {
      const msgDate = new Date(c.timestamp);
      const minTime = new Date(msgDate.getTime() - 1000);
      const maxTime = new Date(msgDate.getTime() + 1000);

      // Deduplicate
      const existing = await Chat.findOne({
        meetingId,
        sender: c.sender,
        message: c.message,
        timestamp: { $gte: minTime, $lte: maxTime },
      });

      if (existing) {
        console.log(`[CHAT] Skipping duplicate message from batch: ${c.sender}`);
        continue;
      }

      // Resolve Participant reference
      let participantDoc = await Participant.findOne({ name: c.sender });
      if (!participantDoc) {
        participantDoc = new Participant({ name: c.sender });
        await participantDoc.save();
      }

      const chat = new Chat({
        meeting: meetingDoc._id,
        meetingId,
        sender: c.sender,
        senderRef: participantDoc._id,
        message: c.message,
        timestamp: msgDate,
      });

      const saved = await chat.save();
      insertedDocs.push(saved);
      console.log(`[CHAT] Saved message from batch: ${c.sender}`);
    }

    return insertedDocs;
  }

  async findByMeeting(meetingId: string) {
    return Chat.find({ meetingId })
      .populate('senderRef')
      .sort({ timestamp: 1 })
      .lean();
  }
}

export const chatService = new ChatService();
