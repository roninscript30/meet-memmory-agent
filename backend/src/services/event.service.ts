import { Event } from '../models/event.model';
import { Meeting } from '../models/meeting.model';
import { Participant } from '../models/participant.model';
import { CreateEventBody } from '../types';
import mongoose from 'mongoose';

export class EventService {
  async create(meetingId: string, data: CreateEventBody) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`[EVENT] Meeting not found: ${meetingId}`);
    }

    // ── Speaker Timeline Logic ───────────────────────────
    if (data.type === 'speaker_changed') {
      const latestSpeakerEvent = await Event.findOne({
        meeting: meetingDoc._id,
        type: 'speaker_changed',
      }).sort({ timestamp: -1 });

      if (latestSpeakerEvent) {
        if (latestSpeakerEvent.speaker === data.speaker && !latestSpeakerEvent.endedAt) {
          console.log(`[SPEAKER] Speaker unchanged (${data.speaker}), skipping event creation`);
          return latestSpeakerEvent;
        }

        if (!latestSpeakerEvent.endedAt) {
          latestSpeakerEvent.endedAt = new Date(data.timestamp);
          latestSpeakerEvent.duration = Math.round(
            (latestSpeakerEvent.endedAt.getTime() - latestSpeakerEvent.timestamp.getTime()) / 1000
          );
          await latestSpeakerEvent.save();
          console.log(`[SPEAKER] Timeline closed for ${latestSpeakerEvent.speaker}. Duration: ${latestSpeakerEvent.duration}s`);
        }
      }
    }

    // Resolve Participant Registry reference
    let participantRef: mongoose.Types.ObjectId | undefined;
    if (data.participant) {
      let partDoc = await Participant.findOne({ name: data.participant });
      if (!partDoc) {
        console.log(`[EVENT] Registering new participant name: ${data.participant}`);
        partDoc = new Participant({ name: data.participant });
        await partDoc.save();
      }
      participantRef = partDoc._id as mongoose.Types.ObjectId;
    }

    const event = new Event({
      meeting: meetingDoc._id,
      meetingId,
      type: data.type,
      participant: data.participant,
      participantRef,
      speaker: data.speaker,
      timestamp: new Date(data.timestamp),
      metadata: data.metadata,
    });

    console.log(`[EVENT] Created event: ${data.type}`);
    return event.save();
  }

  async createBatch(meetingId: string, events: CreateEventBody[]) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`[EVENT] Meeting not found: ${meetingId}`);
    }

    const createdDocs = [];

    // Process sequentially to ensure timeline/relationship checks work perfectly
    for (const e of events) {
      // ── Speaker Timeline Logic ───────────────────────────
      if (e.type === 'speaker_changed') {
        const latestSpeakerEvent = await Event.findOne({
          meeting: meetingDoc._id,
          type: 'speaker_changed',
        }).sort({ timestamp: -1 });

        if (latestSpeakerEvent) {
          if (latestSpeakerEvent.speaker === e.speaker && !latestSpeakerEvent.endedAt) {
            console.log(`[SPEAKER] Speaker unchanged (${e.speaker}), skipping batch event`);
            continue;
          }

          if (!latestSpeakerEvent.endedAt) {
            latestSpeakerEvent.endedAt = new Date(e.timestamp);
            latestSpeakerEvent.duration = Math.round(
              (latestSpeakerEvent.endedAt.getTime() - latestSpeakerEvent.timestamp.getTime()) / 1000
            );
            await latestSpeakerEvent.save();
            console.log(`[SPEAKER] Timeline closed for ${latestSpeakerEvent.speaker}. Duration: ${latestSpeakerEvent.duration}s`);
          }
        }
      }

      // Resolve Participant Registry reference
      let participantRef: mongoose.Types.ObjectId | undefined;
      if (e.participant) {
        let partDoc = await Participant.findOne({ name: e.participant });
        if (!partDoc) {
          console.log(`[EVENT] Registering new participant name: ${e.participant}`);
          partDoc = new Participant({ name: e.participant });
          await partDoc.save();
        }
        participantRef = partDoc._id as mongoose.Types.ObjectId;
      }

      const event = new Event({
        meeting: meetingDoc._id,
        meetingId,
        type: e.type,
        participant: e.participant,
        participantRef,
        speaker: e.speaker,
        timestamp: new Date(e.timestamp),
        metadata: e.metadata,
      });

      const saved = await event.save();
      createdDocs.push(saved);
      console.log(`[EVENT] Batch event created: ${e.type}`);
    }

    return createdDocs;
  }

  async findByMeeting(meetingId: string) {
    return Event.find({ meetingId }).sort({ timestamp: 1 }).lean();
  }

  async findByMeetingAndType(meetingId: string, type: string) {
    return Event.find({ meetingId, type }).sort({ timestamp: 1 }).lean();
  }
}

export const eventService = new EventService();
