import { Participant } from '../models/participant.model';
import { Meeting } from '../models/meeting.model';
import { CreateParticipantBody } from '../types';
import { meetingService } from './meeting.service';

export class ParticipantService {
  async addToMeeting(meetingId: string, data: CreateParticipantBody) {
    const existing = await Participant.findOne({
      meetingId,
      name: data.name,
      leftAt: { $exists: false },
    });

    if (existing) return existing;

    const meetingDoc = await Meeting.findOne({ meetingId });
    if (!meetingDoc) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const participant = new Participant({
      meeting: meetingDoc._id,
      meetingId,
      name: data.name,
      joinedAt: new Date(data.joinedAt),
    });

    await meetingService.incrementParticipantCount(meetingId);
    return participant.save();
  }

  async markLeft(meetingId: string, name: string, leftAt: string) {
    const participant = await Participant.findOneAndUpdate(
      { meetingId, name, leftAt: { $exists: false } },
      { $set: { leftAt: new Date(leftAt) } },
      { new: true }
    );

    if (participant && participant.leftAt && participant.joinedAt) {
      participant.duration = Math.round(
        (participant.leftAt.getTime() - participant.joinedAt.getTime()) / 1000
      );
      await participant.save();
    }

    return participant;
  }

  async findByMeeting(meetingId: string) {
    return Participant.find({ meetingId }).sort({ joinedAt: 1 }).lean();
  }
}

export const participantService = new ParticipantService();
