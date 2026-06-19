import { AudioChunk } from '../models/audio-chunk.model';
import { Meeting } from '../models/meeting.model';

export class AudioService {
  async saveChunk(data: {
    meetingId: string;
    chunkIndex: number;
    filePath: string;
    duration: number;
    size: number;
    mimeType: string;
    timestamp: string;
  }) {
    const meetingDoc = await Meeting.findOne({ meetingId: data.meetingId });
    if (!meetingDoc) {
      throw new Error(`Meeting not found: ${data.meetingId}`);
    }

    const chunk = new AudioChunk({
      meeting: meetingDoc._id,
      meetingId: data.meetingId,
      chunkIndex: data.chunkIndex,
      filePath: data.filePath,
      duration: data.duration,
      size: data.size,
      mimeType: data.mimeType,
      timestamp: new Date(data.timestamp),
    });
    return chunk.save();
  }

  async findByMeeting(meetingId: string) {
    return AudioChunk.find({ meetingId }).sort({ chunkIndex: 1 }).lean();
  }

  async getLatestChunkIndex(meetingId: string): Promise<number> {
    const latest = await AudioChunk.findOne({ meetingId })
      .sort({ chunkIndex: -1 })
      .lean();
    return latest ? latest.chunkIndex : -1;
  }
}

export const audioService = new AudioService();
