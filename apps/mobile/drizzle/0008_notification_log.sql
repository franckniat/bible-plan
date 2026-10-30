CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`href` text NOT NULL,
	`at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE INDEX `notification_log_at` ON `notification_log` (`at`);