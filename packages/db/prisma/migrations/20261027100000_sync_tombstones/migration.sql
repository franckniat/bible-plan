-- CreateTable
CREATE TABLE "SyncTombstone" (
    "id" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass),
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncTombstone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncTombstone_userId_syncVersion_idx" ON "SyncTombstone"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "SyncTombstone_deletedAt_idx" ON "SyncTombstone"("deletedAt");


-- Each deleted synced record leaves a tombstone for its owner (the column
-- named as argument), cascades included. Records without an owner left (a
-- progress whose enrollment is being deleted) need none: the phone drops
-- them with their parent.
CREATE FUNCTION "record_tombstone"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  owner text := to_jsonb(OLD) ->> TG_ARGV[0];
BEGIN
  IF owner IS NOT NULL THEN
    INSERT INTO "SyncTombstone" ("id", "table", "recordId", "userId")
    VALUES (gen_random_uuid()::text, TG_TABLE_NAME, OLD."id", owner);
  END IF;
  RETURN OLD;
END $$;

-- A reading progress belongs to the person of its enrollment.
CREATE FUNCTION "record_progress_tombstone"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  owner text;
BEGIN
  SELECT "userId" INTO owner FROM "PlanEnrollment" WHERE "id" = OLD."enrollmentId";
  IF owner IS NOT NULL THEN
    INSERT INTO "SyncTombstone" ("id", "table", "recordId", "userId")
    VALUES (gen_random_uuid()::text, TG_TABLE_NAME, OLD."id", owner);
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER "ReadingPlan_tombstone" AFTER DELETE ON "ReadingPlan"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('ownerId');
CREATE TRIGGER "PlanEnrollment_tombstone" AFTER DELETE ON "PlanEnrollment"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
CREATE TRIGGER "ReadingProgress_tombstone" AFTER DELETE ON "ReadingProgress"
  FOR EACH ROW EXECUTE FUNCTION "record_progress_tombstone"();
CREATE TRIGGER "PrayerRequest_tombstone" AFTER DELETE ON "PrayerRequest"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
CREATE TRIGGER "PrayerLog_tombstone" AFTER DELETE ON "PrayerLog"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
CREATE TRIGGER "MeditationSession_tombstone" AFTER DELETE ON "MeditationSession"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
CREATE TRIGGER "MeditationNote_tombstone" AFTER DELETE ON "MeditationNote"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
CREATE TRIGGER "Highlight_tombstone" AFTER DELETE ON "Highlight"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
CREATE TRIGGER "Reminder_tombstone" AFTER DELETE ON "Reminder"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
CREATE TRIGGER "Achievement_tombstone" AFTER DELETE ON "Achievement"
  FOR EACH ROW EXECUTE FUNCTION "record_tombstone"('userId');
