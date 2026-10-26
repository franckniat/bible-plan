CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table` text NOT NULL,
	`record_id` text NOT NULL,
	`op` text NOT NULL,
	`data` text,
	`client_updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`locale` text,
	`time_zone` text NOT NULL,
	`bible_version` text,
	`reading_speed` text DEFAULT 'normal' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
