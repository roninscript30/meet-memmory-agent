import mongoose, { Schema, Document } from 'mongoose';
import { toISTString } from '../utils/timezone';

export interface IEvent extends Document {
  meeting: mongoose.Types.ObjectId;
  meetingId: string;
  type:
    | 'participant_joined'
    | 'participant_left'
    | 'speaker_changed'
    | 'screen_share_started'
    | 'screen_share_stopped'
    | 'meeting_started'
    | 'meeting_ended';
  participant?: string;
  speaker?: string;
  timestamp: Date;
  timestampIST?: string;
  metadata?: Record<string, unknown>;
  createdAtIST?: string;
  updatedAtIST?: string;
}

const EventSchema = new Schema<IEvent>(
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
    type: {
      type: String,
      required: true,
      enum: [
        'participant_joined',
        'participant_left',
        'speaker_changed',
        'screen_share_started',
        'screen_share_stopped',
        'meeting_started',
        'meeting_ended',
      ],
    },
    participant: {
      type: String,
    },
    speaker: {
      type: String,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    timestampIST: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
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

EventSchema.index({ meetingId: 1, timestamp: 1 });
EventSchema.index({ meeting: 1, timestamp: 1 });
EventSchema.index({ type: 1 });

EventSchema.pre('save', function (next) {
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

export const Event = mongoose.model<IEvent>('Event', EventSchema);
