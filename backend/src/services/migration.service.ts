import mongoose from 'mongoose';
import { Participant } from '../models/participant.model';
import { ParticipantSession } from '../models/participant-session.model';
import { Event } from '../models/event.model';
import { Chat } from '../models/chat.model';

export class MigrationService {
  async runMigrations(): Promise<void> {
    console.log('[MONGODB] Checking for database migrations...');
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('[MONGODB] Database connection not ready for migrations');
      return;
    }

    try {
      const participantsColl = db.collection('participants');
      
      // Get all raw participant documents
      const allRawParticipants = await participantsColl.find({}).toArray();
      
      let migratedCount = 0;

      for (const raw of allRawParticipants) {
        // If a participant document contains 'meetingId', it is a legacy session record
        if (raw.meetingId) {
          console.log(`[MONGODB] Migrating legacy participant record for: ${raw.name}`);

          // 1. Find or create the master Participant record
          let participantDoc = await Participant.findOne({ name: raw.name });
          if (!participantDoc) {
            participantDoc = new Participant({ name: raw.name });
            // Preserve timestamps if available
            if (raw.createdAt) participantDoc.set('createdAt', raw.createdAt);
            await participantDoc.save();
          }

          // 2. Create the ParticipantSession record
          const sessionDoc = new ParticipantSession({
            meeting: raw.meeting,
            meetingId: raw.meetingId,
            participant: participantDoc._id,
            name: raw.name,
            joinedAt: raw.joinedAt || raw.createdAt || new Date(),
            leftAt: raw.leftAt,
            duration: raw.duration,
          });
          await sessionDoc.save();

          // 3. Remove the legacy session fields from the participant document,
          // or just delete the legacy document and let the master record stand.
          await participantsColl.deleteOne({ _id: raw._id });
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        console.log(`[MONGODB] Successfully migrated ${migratedCount} legacy participant sessions`);
      } else {
        console.log('[MONGODB] No legacy participant sessions required migration');
      }

      // ── Populate participant references on existing Event / Chat documents ──────────
      const eventsToUpdate = await Event.find({ participantRef: { $exists: false }, participant: { $exists: true } });
      for (const ev of eventsToUpdate) {
        if (ev.participant) {
          const part = await Participant.findOne({ name: ev.participant });
          if (part) {
            ev.participantRef = part._id as mongoose.Types.ObjectId;
            await ev.save();
          }
        }
      }

      const chatsToUpdate = await Chat.find({ senderRef: { $exists: false } });
      for (const ch of chatsToUpdate) {
        const part = await Participant.findOne({ name: ch.sender });
        if (part) {
          ch.senderRef = part._id as mongoose.Types.ObjectId;
          await ch.save();
        }
      }

      console.log('[MONGODB] Migration checks completed successfully');
    } catch (err) {
      console.error('[MONGODB] Error running database migrations:', err);
    }
  }
}

export const migrationService = new MigrationService();
