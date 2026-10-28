CREATE TABLE `plan_days` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`date` text NOT NULL,
	`verses` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `reading_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_days_number` ON `plan_days` (`plan_id`,`day_number`);--> statement-breakpoint
CREATE TABLE `plan_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `reading_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_enrollments_plan` ON `plan_enrollments` (`plan_id`);--> statement-breakpoint
CREATE TABLE `plan_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`day_id` text NOT NULL,
	`position` integer NOT NULL,
	`track` integer NOT NULL,
	`book` text NOT NULL,
	`start_chapter` integer NOT NULL,
	`start_verse` integer NOT NULL,
	`end_chapter` integer NOT NULL,
	`end_verse` integer NOT NULL,
	`verses` integer NOT NULL,
	FOREIGN KEY (`day_id`) REFERENCES `plan_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_readings_day` ON `plan_readings` (`day_id`);--> statement-breakpoint
CREATE TABLE `reading_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`template_key` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`active_weekdays` text NOT NULL,
	`tracks` text NOT NULL,
	`pace` text NOT NULL,
	`total_days` integer NOT NULL,
	`total_verses` integer NOT NULL,
	`total_readings` integer NOT NULL,
	`catch_up_strategy` text NOT NULL,
	`group_id` text,
	`updated_at` text NOT NULL
);
