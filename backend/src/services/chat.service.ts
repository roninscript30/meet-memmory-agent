import { Chat } from '../models/chat.model';
import { Meeting } from '../models/meeting.model';
import { CreateChatBody } from '../types';

export class ChatService {
  async create(meetingId: string, data: CreateChatBody) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const chat = new Chat({
      meeting: meetingDoc._id,
      meetingId,
      sender: data.sender,
      message: data.message,
      timestamp: new Date(data.timestamp),
    });
    return chat.save();
  }

  async createBatch(meetingId: string, chats: CreateChatBody[]) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const docs = chats.map((c) => ({
      meeting: meetingDoc._id,
      meetingId,
      sender: c.sender,
      message: c.message,
      timestamp: new Date(c.timestamp),
    }));
    return Chat.insertMany(docs);
  }

  async findByMeeting(meetingId: string) {
    return Chat.find({ meetingId }).sort({ timestamp: 1 }).lean();
  }
}

export const chatService = new ChatService();
