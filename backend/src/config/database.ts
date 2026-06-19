import mongoose from 'mongoose';
import { env } from './env';
import { Meeting } from '../models/meeting.model';
import { Participant } from '../models/participant.model';
import { ParticipantSession } from '../models/participant-session.model';
import { Event } from '../models/event.model';
import { Chat } from '../models/chat.model';
import { AudioChunk } from '../models/audio-chunk.model';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log('[MONGODB] Connection established successfully to:', env.mongodbUri);

    // Explicitly create collections so they show up immediately in Compass
    await Meeting.createCollection();
    await Participant.createCollection();
    await ParticipantSession.createCollection();
    await Event.createCollection();
    await Chat.createCollection();
    await AudioChunk.createCollection();
    console.log('[MONGODB] Relationship-based collections initialized successfully');
  } catch (error) {
    console.error('[MONGODB] Initialization failed:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[MONGODB] Runtime connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MONGODB] Connection lost. Attempting auto-reconnect...');
  });
}
