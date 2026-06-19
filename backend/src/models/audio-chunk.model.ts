import mongoose, { Schema, Document } from 'mongoose';
import { toISTString } from '../utils/timezone';

export interface IAudioChunk extends Document {
  meeting: mongoose.Types.ObjectId;
  meetingId: string;
  chunkIndex: number;
  filePath: string;
  duration: number;
  size: number;
  mimeType: string;
  timestamp: Date;
  timestampIST?: string;
  createdAtIST?: string;
  updatedAtIST?: string;
}

const AudioChunkSchema = new Schema<IAudioChunk>(
  {
    meeting: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true,
    },
    meetingId: {
      type: String,
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 30,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'audio/webm',
    },
    timestamp: {
      type: Date,
      required: true,
    },
    timestampIST: {
      type: String,
    },
    createdAtIST: {
      type: String,
    },
    updatedAtIST: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

AudioChunkSchema.index({ meetingId: 1, chunkIndex: 1 }, { unique: true });
AudioChunkSchema.index({ meeting: 1, chunkIndex: 1 }, { unique: true });

AudioChunkSchema.pre('save', function (next) {
  if (this.timestamp) {
    this.timestampIST = toISTString(this.timestamp);
  }

  const now = new Date();
  if (!this.createdAtIST) {
    this.createdAtIST = toISTString(now);
  }
  this.updatedAtIST = toISTString(now);
  next();
});

export const AudioChunk = mongoose.model<IAudioChunk>(
  'AudioChunk',
  AudioChunkSchema
);
