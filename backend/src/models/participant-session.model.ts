import mongoose, { Schema, Document } from 'mongoose';
import { toISTString } from '../utils/timezone';

export interface IParticipantSession extends Document {
  meeting: mongoose.Types.ObjectId;
  meetingId: string;
  participant: mongoose.Types.ObjectId;
  name: string;
  joinedAt: Date;
  joinedAtIST?: string;
  leftAt?: Date;
  leftAtIST?: string;
  duration?: number;
  createdAtIST?: string;
  updatedAtIST?: string;
}

const ParticipantSessionSchema = new Schema<IParticipantSession>(
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
    participant: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
    },
    joinedAtIST: {
      type: String,
    },
    leftAt: {
      type: Date,
    },
    leftAtIST: {
      type: String,
    },
    duration: {
      type: Number,
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

ParticipantSessionSchema.index({ meetingId: 1, name: 1 });
ParticipantSessionSchema.index({ meeting: 1, participant: 1 });

ParticipantSessionSchema.pre('save', function (next) {
  if (this.joinedAt) {
    this.joinedAtIST = toISTString(this.joinedAt);
  }
  if (this.leftAt) {
    this.leftAtIST = toISTString(this.leftAt);
  }

  const now = new Date();
  if (!this.createdAtIST) {
    this.createdAtIST = toISTString(now);
  }
  this.updatedAtIST = toISTString(now);

  if (this.leftAt && this.joinedAt) {
    this.duration = Math.round(
      (this.leftAt.getTime() - this.joinedAt.getTime()) / 1000
    );
  }
  next();
});

export const ParticipantSession = mongoose.model<IParticipantSession>(
  'ParticipantSession',
  ParticipantSessionSchema
);
