import { Event } from '../models/event.model';
import { Meeting } from '../models/meeting.model';
import { CreateEventBody } from '../types';

export class EventService {
  async create(meetingId: string, data: CreateEventBody) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const event = new Event({
      meeting: meetingDoc._id,
      meetingId,
      type: data.type,
      participant: data.participant,
      speaker: data.speaker,
      timestamp: new Date(data.timestamp),
      metadata: data.metadata,
    });
    return event.save();
  }

  async createBatch(meetingId: string, events: CreateEventBody[]) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const docs = events.map((e) => ({
      meeting: meetingDoc._id,
      meetingId,
      type: e.type,
      participant: e.participant,
      speaker: e.speaker,
      timestamp: new Date(e.timestamp),
      metadata: e.metadata,
    }));
    return Event.insertMany(docs);
  }

  async findByMeeting(meetingId: string) {
    return Event.find({ meetingId }).sort({ timestamp: 1 }).lean();
  }

  async findByMeetingAndType(meetingId: string, type: string) {
    return Event.find({ meetingId, type }).sort({ timestamp: 1 }).lean();
  }
}

export const eventService = new EventService();
