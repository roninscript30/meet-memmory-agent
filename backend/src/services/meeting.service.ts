import { Meeting } from '../models/meeting.model';
import { Participant } from '../models/participant.model';
import { Event } from '../models/event.model';
import { Chat } from '../models/chat.model';
import { AudioChunk } from '../models/audio-chunk.model';
import { CreateMeetingBody, UpdateMeetingBody } from '../types';

export class MeetingService {
  async create(data: CreateMeetingBody) {
    const meeting = new Meeting({
      meetingId: data.meetingId,
      title: data.title || 'Untitled Meeting',
      platform: data.platform,
      url: data.url,
      startedAt: new Date(data.startedAt),
      status: 'active',
    });
    return meeting.save();
  }

  async update(meetingId: string, data: UpdateMeetingBody) {
    const update: Record<string, unknown> = {};
    if (data.endedAt) {
      update.endedAt = new Date(data.endedAt);
      update.status = 'ended';
    }
    if (data.title) update.title = data.title;
    if (data.status) update.status = data.status;

    const meeting = await Meeting.findOneAndUpdate(
      { meetingId },
      { $set: update },
      { new: true }
    );

    // Auto-calculate duration
    if (meeting && meeting.endedAt && meeting.startedAt) {
      meeting.duration = Math.round(
        (meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000
      );
      await meeting.save();
    }

    return meeting;
  }

  async findAll() {
    return Meeting.find().sort({ startedAt: -1 }).lean();
  }

  async findByMeetingId(meetingId: string) {
    return Meeting.findOne({ meetingId }).lean();
  }

  async findByMeetingIdFull(meetingId: string): Promise<Record<string, any> | null> {
    const meeting = await Meeting.findOne({ meetingId }).lean();
    if (!meeting) return null;

    const [participants, events, chats, audioChunks] = await Promise.all([
      Participant.find({ meetingId }).sort({ joinedAt: 1 }).lean(),
      Event.find({ meetingId }).sort({ timestamp: 1 }).lean(),
      Chat.find({ meetingId }).sort({ timestamp: 1 }).lean(),
      AudioChunk.find({ meetingId }).sort({ chunkIndex: 1 }).lean(),
    ]);

    return { ...meeting, participants, events, chats, audioChunks };
  }

  async incrementParticipantCount(meetingId: string): Promise<void> {
    await Meeting.updateOne({ meetingId }, { $inc: { participantCount: 1 } });
  }
}

export const meetingService = new MeetingService();
