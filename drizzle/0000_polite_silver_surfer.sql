CREATE TABLE `axis_groups` (
	`axis_group_id` text PRIMARY KEY NOT NULL,
	`name_he` text NOT NULL,
	`name_en` text NOT NULL,
	`start_column` text NOT NULL,
	`end_column` text NOT NULL,
	`header_fill` text NOT NULL,
	`name_fill` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `callouts` (
	`callout_id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`phase` text NOT NULL,
	`anchor_cell` text NOT NULL,
	`text_he` text NOT NULL,
	`text_en` text
);
--> statement-breakpoint
CREATE TABLE `channel_text` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`likelihood` text,
	`likelihood_cell_ref` text NOT NULL,
	`barriers_he` text,
	`barriers_en` text,
	`barriers_cell_ref` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `channels` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`column_letter` text NOT NULL,
	`column_order` integer NOT NULL,
	`axis_group_id` text NOT NULL,
	`name_he` text NOT NULL,
	`name_en` text NOT NULL,
	`potential_mw` real,
	`potential_raw` text,
	`energy_role` text NOT NULL,
	`cf` real,
	`ci_g_per_kwh` real,
	`params_recovered` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `color_scale_rules` (
	`rule_id` text PRIMARY KEY NOT NULL,
	`dimension` text NOT NULL,
	`ranges` text NOT NULL,
	`low` text NOT NULL,
	`mid` text NOT NULL,
	`high` text NOT NULL,
	`mid_percentile` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dataset_meta` (
	`dataset_version` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`sha256` text NOT NULL,
	`ingested_at` text NOT NULL,
	`row_count` integer NOT NULL,
	`column_count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dimension_averages` (
	`channel_id` text NOT NULL,
	`dimension` text NOT NULL,
	`value` real,
	`cell_ref` text NOT NULL,
	PRIMARY KEY(`channel_id`, `dimension`)
);
--> statement-breakpoint
CREATE TABLE `phase_bands` (
	`phase` text PRIMARY KEY NOT NULL,
	`start_row` integer NOT NULL,
	`end_row` integer NOT NULL,
	`label_fill` text NOT NULL,
	`body_fill` text NOT NULL,
	`sub_groups` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ramp` (
	`year` integer PRIMARY KEY NOT NULL,
	`value` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roadmap_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`phase` text NOT NULL,
	`kind` text NOT NULL,
	`slot` integer NOT NULL,
	`title_he` text,
	`detail_he` text,
	`challenges_he` text,
	`title_en` text,
	`detail_en` text,
	`challenges_en` text,
	`cell_refs` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `row_labels` (
	`row` integer PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`label_he` text,
	`label_en` text NOT NULL,
	`visible` integer NOT NULL,
	`height_pt` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sparkline_specs` (
	`dimension` text PRIMARY KEY NOT NULL,
	`metric` text NOT NULL,
	`axis_min` real NOT NULL,
	`axis_max` real NOT NULL,
	`fill` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sub_scores` (
	`channel_id` text NOT NULL,
	`dimension` text NOT NULL,
	`key` text NOT NULL,
	`value` real,
	`cell_ref` text NOT NULL,
	PRIMARY KEY(`channel_id`, `dimension`, `key`)
);
--> statement-breakpoint
CREATE TABLE `trajectories` (
	`channel_id` text NOT NULL,
	`metric` text NOT NULL,
	`year` integer NOT NULL,
	`value` real,
	`cell_ref` text NOT NULL,
	PRIMARY KEY(`channel_id`, `metric`, `year`)
);
