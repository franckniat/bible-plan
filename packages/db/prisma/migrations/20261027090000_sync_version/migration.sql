-- The cursor of the mobile sync: one sequence shared by every synced table,
-- so a single number says "everything changed since".
CREATE SEQUENCE "sync_version_seq";
-- AlterTable
ALTER TABLE "ReadingPlan" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass);

-- AlterTable
ALTER TABLE "PlanEnrollment" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass);

-- AlterTable
ALTER TABLE "ReadingProgress" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass);

-- AlterTable
ALTER TABLE "Highlight" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass);

-- AlterTable
ALTER TABLE "PrayerRequest" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass);

-- AlterTable
ALTER TABLE "PrayerLog" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MeditationSession" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MeditationNote" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass);

-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "syncVersion" BIGINT NOT NULL DEFAULT nextval('sync_version_seq'::regclass),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ReadingPlan_ownerId_syncVersion_idx" ON "ReadingPlan"("ownerId", "syncVersion");

-- CreateIndex
CREATE INDEX "PlanEnrollment_userId_syncVersion_idx" ON "PlanEnrollment"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "ReadingProgress_enrollmentId_syncVersion_idx" ON "ReadingProgress"("enrollmentId", "syncVersion");

-- CreateIndex
CREATE INDEX "Reminder_userId_syncVersion_idx" ON "Reminder"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "Highlight_userId_syncVersion_idx" ON "Highlight"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "PrayerRequest_userId_syncVersion_idx" ON "PrayerRequest"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "PrayerLog_userId_syncVersion_idx" ON "PrayerLog"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "MeditationSession_userId_syncVersion_idx" ON "MeditationSession"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "MeditationNote_userId_syncVersion_idx" ON "MeditationNote"("userId", "syncVersion");

-- CreateIndex
CREATE INDEX "Achievement_userId_syncVersion_idx" ON "Achievement"("userId", "syncVersion");

-- Each insert or real change takes the next number. An update that only
-- touches ignored columns keeps its number: updatedAt (Prisma sets it on every
-- update) and the columns named as trigger arguments. An update that sets
-- syncVersion itself (a plan whose days changed) keeps the value it sets.
CREATE FUNCTION "set_sync_version"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  ignored text[] := ARRAY['syncVersion', 'updatedAt'] || TG_ARGV;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."syncVersion" IS DISTINCT FROM OLD."syncVersion" THEN
      RETURN NEW;
    END IF;
    IF (to_jsonb(NEW) - ignored) = (to_jsonb(OLD) - ignored) THEN
      RETURN NEW;
    END IF;
  END IF;
  NEW."syncVersion" := nextval('sync_version_seq');
  RETURN NEW;
END $$;

CREATE TRIGGER "ReadingPlan_sync_version" BEFORE INSERT OR UPDATE ON "ReadingPlan"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
CREATE TRIGGER "PlanEnrollment_sync_version" BEFORE INSERT OR UPDATE ON "PlanEnrollment"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
CREATE TRIGGER "ReadingProgress_sync_version" BEFORE INSERT OR UPDATE ON "ReadingProgress"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
CREATE TRIGGER "PrayerRequest_sync_version" BEFORE INSERT OR UPDATE ON "PrayerRequest"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
CREATE TRIGGER "PrayerLog_sync_version" BEFORE INSERT OR UPDATE ON "PrayerLog"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
CREATE TRIGGER "MeditationSession_sync_version" BEFORE INSERT OR UPDATE ON "MeditationSession"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
CREATE TRIGGER "MeditationNote_sync_version" BEFORE INSERT OR UPDATE ON "MeditationNote"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
CREATE TRIGGER "Highlight_sync_version" BEFORE INSERT OR UPDATE ON "Highlight"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"();
-- The reminder dispatcher moves nextRunAt and lastRunAt at every run: no sync.
CREATE TRIGGER "Reminder_sync_version" BEFORE INSERT OR UPDATE ON "Reminder"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"('nextRunAt', 'lastRunAt');
-- seenAt is the celebration on one device, not shared.
CREATE TRIGGER "Achievement_sync_version" BEFORE INSERT OR UPDATE ON "Achievement"
  FOR EACH ROW EXECUTE FUNCTION "set_sync_version"('seenAt');

-- A plan, its days and its readings are synced as one aggregate: any change of
-- its days or readings gives the plan a new number.
CREATE FUNCTION "bump_plan_of_days"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "ReadingPlan" SET "syncVersion" = nextval('sync_version_seq')
  WHERE id IN (SELECT "planId" FROM changed);
  RETURN NULL;
END $$;

CREATE FUNCTION "bump_plan_of_readings"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "ReadingPlan" SET "syncVersion" = nextval('sync_version_seq')
  WHERE id IN (
    SELECT d."planId" FROM "PlanDay" d JOIN changed c ON c."dayId" = d.id
  );
  RETURN NULL;
END $$;

CREATE TRIGGER "PlanDay_insert_bump_plan" AFTER INSERT ON "PlanDay"
  REFERENCING NEW TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION "bump_plan_of_days"();
CREATE TRIGGER "PlanDay_update_bump_plan" AFTER UPDATE ON "PlanDay"
  REFERENCING NEW TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION "bump_plan_of_days"();
CREATE TRIGGER "PlanDay_delete_bump_plan" AFTER DELETE ON "PlanDay"
  REFERENCING OLD TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION "bump_plan_of_days"();
CREATE TRIGGER "PlanReading_insert_bump_plan" AFTER INSERT ON "PlanReading"
  REFERENCING NEW TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION "bump_plan_of_readings"();
CREATE TRIGGER "PlanReading_update_bump_plan" AFTER UPDATE ON "PlanReading"
  REFERENCING NEW TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION "bump_plan_of_readings"();
CREATE TRIGGER "PlanReading_delete_bump_plan" AFTER DELETE ON "PlanReading"
  REFERENCING OLD TABLE AS changed
  FOR EACH STATEMENT EXECUTE FUNCTION "bump_plan_of_readings"();
