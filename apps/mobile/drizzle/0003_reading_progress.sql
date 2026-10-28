CREATE TABLE `reading_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`reading_id` text NOT NULL,
	`completed_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `plan_enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reading_id`) REFERENCES `plan_readings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_progress_reading` ON `reading_progress` (`enrollment_id`,`reading_id`);