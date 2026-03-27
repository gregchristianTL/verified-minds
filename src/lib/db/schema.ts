import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const verifiedUsers = sqliteTable("verified_users", {
  id: text("id").primaryKey(),
  worldIdHash: text("world_id_hash").unique().notNull(),
  walletAddress: text("wallet_address"),
  verificationLevel: text("verification_level").default("device"),
  createdAt: text("created_at").notNull(),
});

export const expertProfiles = sqliteTable("expert_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => verifiedUsers.id),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  /** JSON array of domain strings */
  domains: text("domains").default("[]"),
  /** JSON object: domain -> confidence score (0-100) */
  confidenceMap: text("confidence_map").default("{}"),
  knowledgeItemCount: integer("knowledge_item_count").default(0),
  /** ADIN custom agent ID once created */
  adinAgentId: text("adin_agent_id"),
  /** ADIN user ID (from wallet resolution) */
  adinUserId: text("adin_user_id"),
  status: text("status").default("extracting"),
  queryPrice: text("query_price").default("0.05"),
  totalEarnings: text("total_earnings").default("0"),
  createdAt: text("created_at").notNull(),
});

export const extractionSessions = sqliteTable("extraction_sessions", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => expertProfiles.id),
  realtimeSessionId: text("realtime_session_id"),
  durationSeconds: integer("duration_seconds"),
  knowledgeItemsAdded: integer("knowledge_items_added").default(0),
  /** JSON array of domains covered this session */
  domainsCovered: text("domains_covered").default("[]"),
  sessionSummary: text("session_summary"),
  createdAt: text("created_at").notNull(),
});

/** Knowledge items extracted during interviews — used to build the agent's system prompt */
export const knowledgeItems = sqliteTable("knowledge_items", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => expertProfiles.id),
  sessionId: text("session_id").references(() => extractionSessions.id),
  domain: text("domain").notNull(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  phase: text("phase").notNull(),
  createdAt: text("created_at").notNull(),
});

export const expertEarnings = sqliteTable("expert_earnings", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => expertProfiles.id),
  querySummary: text("query_summary"),
  domainTag: text("domain_tag"),
  amount: real("amount").notNull(),
  txHash: text("tx_hash"),
  createdAt: text("created_at").notNull(),
});
