import mongoose, { Schema, Document } from 'mongoose';
import { toISTString } from '../utils/timezone';

export interface IChat extends Document {
  meeting: mongoose.Types.ObjectId;
  meetingId: string;
  sender: string;
  senderRef?: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
  timestampIST?: string;
  createdAtIST?: string;
  updatedAtIST?: string;
}

const ChatSchema = new Schema<IChat>(
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
    sender: {
      type: String,
      required: true,
    },
    senderRef: {
      type: Schema.Types.ObjectId,
      ref: 'Participant',
      index: true,
    },
    message: {
      type: String,
      required: true,
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

ChatSchema.index({ meetingId: 1, timestamp: 1 });
ChatSchema.index({ meeting: 1, timestamp: 1 });

ChatSchema.pre('save', function (next) {
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

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);
