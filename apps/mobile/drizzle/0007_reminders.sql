CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`local_time` text NOT NULL,
	`timezone` text NOT NULL,
	`weekdays` text NOT NULL,
	`channels` text NOT NULL,
	`enabled` integer NOT NULL,
	`lead_minutes` integer NOT NULL,
	`duration_minutes` integer,
	`focus_mode` text NOT NULL,
	`updated_at` text NOT NULL
);
