CREATE TABLE `highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`book` text NOT NULL,
	`chapter` integer NOT NULL,
	`verse` integer NOT NULL,
	`color` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `highlights_verse` ON `highlights` (`book`,`chapter`,`verse`);