import { Participant } from '../models/participant.model';
import { ParticipantSession } from '../models/participant-session.model';
import { Meeting } from '../models/meeting.model';
import { CreateParticipantBody } from '../types';
import { meetingService } from './meeting.service';

export class ParticipantService {
  async addToMeeting(meetingId: string, data: CreateParticipantBody) {
    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`[PARTICIPANT] Meeting not found: ${meetingId}`);
    }

    // 1. Find or create the master Participant registry record
    let participantDoc = await Participant.findOne({ name: data.name });
    if (!participantDoc) {
      console.log(`[PARTICIPANT] Registering new participant name: ${data.name}`);
      participantDoc = new Participant({ name: data.name });
      await participantDoc.save();
    }

    // 2. Check if an active session already exists for this participant/meeting
    const existingSession = await ParticipantSession.findOne({
      meeting: meetingDoc._id,
      participant: participantDoc._id,
      leftAt: { $exists: false },
    });

    if (existingSession) {
      console.log(`[PARTICIPANT] Active session already exists for ${data.name} in meeting ${meetingId}`);
      return existingSession;
    }

    // 3. Create a new ParticipantSession
    console.log(`[PARTICIPANT] Creating new session for ${data.name} in meeting ${meetingId}`);
    const session = new ParticipantSession({
      meeting: meetingDoc._id,
      meetingId,
      participant: participantDoc._id,
      name: data.name,
      joinedAt: new Date(data.joinedAt),
    });

    await meetingService.incrementParticipantCount(meetingId);
    return session.save();
  }

  async markLeft(meetingId: string, name: string, leftAt: string) {
    const participantDoc = await Participant.findOne({ name });
    if (!participantDoc) {
      console.warn(`[PARTICIPANT] No registered participant found for name: ${name}`);
      return null;
    }

    console.log(`[PARTICIPANT] Closing active session for ${name} in meeting ${meetingId}`);
    const session = await ParticipantSession.findOneAndUpdate(
      { 
        meetingId, 
        participant: participantDoc._id, 
        leftAt: { $exists: false } 
      },
      { $set: { leftAt: new Date(leftAt) } },
      { new: true }
    );

    if (session && session.leftAt && session.joinedAt) {
      session.duration = Math.round(
        (session.leftAt.getTime() - session.joinedAt.getTime()) / 1000
      );
      await session.save();
      console.log(`[PARTICIPANT] Session closed. Duration: ${session.duration}s`);
    } else {
      console.warn(`[PARTICIPANT] No active session found to close for ${name} in meeting ${meetingId}`);
    }

    return session;
  }

  async findByMeeting(meetingId: string) {
    return ParticipantSession.find({ meetingId })
      .populate('participant')
      .sort({ joinedAt: 1 })
      .lean();
  }
}

export const participantService = new ParticipantService();
