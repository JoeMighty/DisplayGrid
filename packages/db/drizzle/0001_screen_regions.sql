CREATE TABLE `screen_regions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`screen_id` integer NOT NULL,
	`name` text NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`width` real DEFAULT 100 NOT NULL,
	`height` real DEFAULT 100 NOT NULL,
	`playlist_id` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`screen_id`) REFERENCES `screens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE set null
);
