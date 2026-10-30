CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`level` integer NOT NULL,
	`unlocked_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`seen_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_level` ON `achievements` (`key`,`level`);