import mongoose, { Schema, Document } from 'mongoose';
import { toISTString } from '../utils/timezone';

export interface IParticipant extends Document {
  name: string;
  createdAtIST?: string;
  updatedAtIST?: string;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
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

ParticipantSchema.pre('save', function (next) {
  const now = new Date();
  if (!this.createdAtIST) {
    this.createdAtIST = toISTString(now);
  }
  this.updatedAtIST = toISTString(now);
  next();
});

export const Participant = mongoose.model<IParticipant>(
  'Participant',
  ParticipantSchema
);
