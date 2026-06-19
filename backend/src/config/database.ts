import mongoose from 'mongoose';
import { env } from './env';
import { Meeting } from '../models/meeting.model';
import { Participant } from '../models/participant.model';
import { Event } from '../models/event.model';
import { Chat } from '../models/chat.model';
import { AudioChunk } from '../models/audio-chunk.model';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log('✅ MongoDB connected:', env.mongodbUri);

    // Explicitly create collections so they show up immediately in Compass
    await Meeting.createCollection();
    await Participant.createCollection();
    await Event.createCollection();
    await Chat.createCollection();
    await AudioChunk.createCollection();
    console.log('✅ MongoDB collections initialized');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting reconnect...');
  });
}
