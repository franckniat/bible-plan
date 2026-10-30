CREATE TABLE `prayer_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`prayed_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prayer_logs_request` ON `prayer_logs` (`request_id`);--> statement-breakpoint
CREATE TABLE `prayer_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`details` text,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`started_on` text NOT NULL,
	`passages` text NOT NULL,
	`last_prayed_at` text,
	`prayer_count` integer NOT NULL,
	`answered_on` text,
	`answer_note` text,
	`group_id` text,
	`updated_at` text NOT NULL
);
