CREATE TABLE "swarm_messages" (
	"seq" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "swarm_messages_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"message_id" text,
	"parent_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_verified_users_world_id_hash";--> statement-breakpoint
ALTER TABLE "expert_earnings" ALTER COLUMN "amount" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
CREATE INDEX "idx_swarm_messages_parent_seq" ON "swarm_messages" USING btree ("parent_id","seq");--> statement-breakpoint
CREATE INDEX "idx_swarm_messages_message_id" ON "swarm_messages" USING btree ("message_id");