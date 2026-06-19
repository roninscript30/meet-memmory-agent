import mongoose, { Schema, Document } from 'mongoose';
import { toISTString } from '../utils/timezone';

export interface IMeeting extends Document {
  meetingId: string;
  title: string;
  platform: 'google_meet' | 'zoho_meeting';
  url: string;
  startedAt: Date;
  startedAtIST: string;
  endedAt?: Date;
  endedAtIST?: string;
  duration?: number;
  participantCount: number;
  status: 'active' | 'ended';
  createdAtIST?: string;
  updatedAtIST?: string;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    meetingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'Untitled Meeting',
    },
    platform: {
      type: String,
      required: true,
      enum: ['google_meet', 'zoho_meeting'],
    },
    url: {
      type: String,
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    startedAtIST: {
      type: String,
    },
    endedAt: {
      type: Date,
    },
    endedAtIST: {
      type: String,
    },
    duration: {
      type: Number,
    },
    participantCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
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

MeetingSchema.index({ platform: 1 });
MeetingSchema.index({ startedAt: -1 });
MeetingSchema.index({ status: 1 });

MeetingSchema.pre('save', function (next) {
  if (this.startedAt) {
    this.startedAtIST = toISTString(this.startedAt);
  }
  if (this.endedAt) {
    this.endedAtIST = toISTString(this.endedAt);
  }

  const now = new Date();
  if (!this.createdAtIST) {
    this.createdAtIST = toISTString(now);
  }
  this.updatedAtIST = toISTString(now);

  if (this.endedAt && this.startedAt) {
    this.duration = Math.round(
      (this.endedAt.getTime() - this.startedAt.getTime()) / 1000
    );
  }
  next();
});

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
