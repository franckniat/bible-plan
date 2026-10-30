CREATE TABLE `skipped_prayer_times` (
	`reminder_id` text NOT NULL,
	`starts_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skipped_prayer_times_key` ON `skipped_prayer_times` (`reminder_id`,`starts_at`);