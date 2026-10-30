// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_profile_and_outbox.sql';
import m0001 from './0001_highlights.sql';
import m0002 from './0002_reading_plans.sql';
import m0003 from './0003_reading_progress.sql';
import m0004 from './0004_prayer_journal.sql';
import m0005 from './0005_sessions.sql';
import m0006 from './0006_meditation_notes.sql';
import m0007 from './0007_reminders.sql';
import m0008 from './0008_notification_log.sql';
import m0009 from './0009_skipped_prayer_times.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006,
m0007,
m0008,
m0009
    }
  }
  