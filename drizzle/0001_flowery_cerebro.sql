ALTER TABLE "expert_profiles" ADD COLUMN "updated_at" text;--> statement-breakpoint
ALTER TABLE "verified_users" ADD COLUMN "updated_at" text;--> statement-breakpoint
CREATE INDEX "idx_expert_earnings_profile_id" ON "expert_earnings" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_expert_earnings_created_at" ON "expert_earnings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_expert_profiles_status" ON "expert_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_expert_profiles_user_id" ON "expert_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_extraction_sessions_profile_id" ON "extraction_sessions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_items_profile_id" ON "knowledge_items" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_verified_users_world_id_hash" ON "verified_users" USING btree ("world_id_hash");