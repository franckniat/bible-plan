CREATE TABLE `meditation_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`book` text NOT NULL,
	`passage` text NOT NULL,
	`key_verse` text,
	`reflection` text,
	`application` text,
	`session_id` text,
	`updated_at` text NOT NULL
);
