CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`type` text NOT NULL,
	`path` text NOT NULL,
	`size_bytes` integer,
	`duration_seconds` real,
	`uploaded_at` integer
);
--> statement-breakpoint
CREATE TABLE `emergency_override` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer,
	`message` text,
	`active_to` integer,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`screen_id` integer NOT NULL,
	`name` text DEFAULT 'Default' NOT NULL,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`screen_id`) REFERENCES `screens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `screen_sessions` (
	`screen_id` integer PRIMARY KEY NOT NULL,
	`last_seen` integer,
	`ip` text,
	`current_slide_id` integer,
	`client_version` text,
	FOREIGN KEY (`screen_id`) REFERENCES `screens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `screens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`zone_id` integer,
	`resolution_w` integer DEFAULT 1920 NOT NULL,
	`resolution_h` integer DEFAULT 1080 NOT NULL,
	`refresh_rate` integer DEFAULT 60 NOT NULL,
	`rotation` integer DEFAULT 0 NOT NULL,
	`panel_grid_cols` integer DEFAULT 1,
	`panel_grid_rows` integer DEFAULT 1,
	`colour_profile` text DEFAULT 'srgb',
	`token` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screens_token_unique` ON `screens` (`token`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `slides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playlist_id` integer NOT NULL,
	`asset_id` integer,
	`content_type` text NOT NULL,
	`content` text,
	`duration_seconds` real DEFAULT 10 NOT NULL,
	`transition` text DEFAULT 'fade',
	`sort_order` integer DEFAULT 0 NOT NULL,
	`schedule_json` text,
	`enabled` integer DEFAULT true,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tutorial_progress` (
	`step` integer PRIMARY KEY NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text
);
