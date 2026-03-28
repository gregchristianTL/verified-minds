CREATE TABLE `custom_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL DEFAULT '🤖',
	`system_prompt` text NOT NULL,
	`tools` text NOT NULL DEFAULT '[]',
	`model_tier` text NOT NULL DEFAULT 'balanced',
	`upgrade_tier` text,
	`is_active` integer NOT NULL DEFAULT true,
	`created_by` text NOT NULL DEFAULT 'orchestrator',
	`metadata` text DEFAULT '{}',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `adin_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`messages` text NOT NULL DEFAULT '[]',
	`message_count` integer NOT NULL DEFAULT 0,
	`title` text,
	`metadata` text DEFAULT '{}',
	`last_message_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`conversation_id` text,
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`content` text NOT NULL,
	`reason` text,
	`importance` integer NOT NULL DEFAULT 3,
	`category` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_memory_unique` ON `agent_memory` (`user_id`,`conversation_id`,`scope`,`key`);
