CREATE TABLE `expert_earnings` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`query_summary` text,
	`domain_tag` text,
	`amount` real NOT NULL,
	`tx_hash` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `expert_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expert_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text,
	`domains` text DEFAULT '[]',
	`confidence_map` text DEFAULT '{}',
	`knowledge_item_count` integer DEFAULT 0,
	`adin_agent_id` text,
	`adin_user_id` text,
	`status` text DEFAULT 'extracting',
	`query_price` text DEFAULT '0.05',
	`total_earnings` text DEFAULT '0',
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `verified_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extraction_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`hume_chat_group_id` text,
	`duration_seconds` integer,
	`knowledge_items_added` integer DEFAULT 0,
	`domains_covered` text DEFAULT '[]',
	`session_summary` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `expert_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `knowledge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`session_id` text,
	`domain` text NOT NULL,
	`topic` text NOT NULL,
	`content` text NOT NULL,
	`phase` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `expert_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `extraction_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `verified_users` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id_hash` text NOT NULL,
	`wallet_address` text,
	`verification_level` text DEFAULT 'device',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verified_users_world_id_hash_unique` ON `verified_users` (`world_id_hash`);