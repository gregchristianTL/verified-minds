CREATE TABLE "adin_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"messages" text DEFAULT '[]' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"title" text,
	"metadata" text DEFAULT '{}',
	"last_message_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"content" text NOT NULL,
	"reason" text,
	"importance" integer DEFAULT 3 NOT NULL,
	"category" text,
	"expires_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"agent_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT '🤖' NOT NULL,
	"system_prompt" text NOT NULL,
	"tools" text DEFAULT '[]' NOT NULL,
	"model_tier" text DEFAULT 'balanced' NOT NULL,
	"upgrade_tier" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text DEFAULT 'orchestrator' NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert_earnings" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"query_summary" text,
	"domain_tag" text,
	"amount" real NOT NULL,
	"tx_hash" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expert_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"domains" text DEFAULT '[]',
	"confidence_map" text DEFAULT '{}',
	"knowledge_item_count" integer DEFAULT 0,
	"adin_agent_id" text,
	"status" text DEFAULT 'extracting',
	"query_price" text DEFAULT '0.05',
	"total_earnings" text DEFAULT '0',
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"realtime_session_id" text,
	"duration_seconds" integer,
	"knowledge_items_added" integer DEFAULT 0,
	"domains_covered" text DEFAULT '[]',
	"session_summary" text,
	"transcript" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_items" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"session_id" text,
	"domain" text NOT NULL,
	"topic" text NOT NULL,
	"content" text NOT NULL,
	"phase" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verified_users" (
	"id" text PRIMARY KEY NOT NULL,
	"world_id_hash" text NOT NULL,
	"wallet_address" text,
	"verification_level" text DEFAULT 'device',
	"created_at" text NOT NULL,
	CONSTRAINT "verified_users_world_id_hash_unique" UNIQUE("world_id_hash")
);
--> statement-breakpoint
ALTER TABLE "expert_earnings" ADD CONSTRAINT "expert_earnings_profile_id_expert_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."expert_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_user_id_verified_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."verified_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_sessions" ADD CONSTRAINT "extraction_sessions_profile_id_expert_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."expert_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_profile_id_expert_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."expert_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_session_id_extraction_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."extraction_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agent_memory_unique" ON "agent_memory" USING btree ("user_id","conversation_id","scope","key");