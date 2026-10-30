CREATE TABLE `meditation_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`passage` text,
	`planned_seconds` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL
);
