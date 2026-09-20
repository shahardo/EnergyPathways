CREATE TABLE `trilemma_color_scale` (
	`id` integer PRIMARY KEY NOT NULL,
	`ranges` text NOT NULL,
	`low` text NOT NULL,
	`mid` text NOT NULL,
	`high` text NOT NULL,
	`mid_percentile` real NOT NULL
);
