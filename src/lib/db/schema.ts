import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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
  /** JSON array of { role, text, ts } transcript entries */
  transcript: text("transcript"),
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

// ---------------------------------------------------------------------------
// ADIN Engine tables
// ---------------------------------------------------------------------------

/** Dynamically created agent definitions, merged with static agents at runtime */
export const customAgents = sqliteTable("custom_agents", {
  id: text("id").primaryKey(),
  /** NULL for global agents, user-scoped otherwise */
  userId: text("user_id"),
  /** URL-safe agent identifier (e.g. "greg-defi-expert") */
  agentId: text("agent_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("🤖"),
  systemPrompt: text("system_prompt").notNull(),
  /** JSON array of tool IDs the agent can use */
  tools: text("tools").notNull().default("[]"),
  modelTier: text("model_tier").notNull().default("balanced"),
  upgradeTier: text("upgrade_tier"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdBy: text("created_by").notNull().default("orchestrator"),
  /** JSON object for arbitrary metadata */
  metadata: text("metadata").default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Persisted conversations for multi-turn agent chat */
export const adinConversations = sqliteTable("adin_conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** JSON array of message objects */
  messages: text("messages").notNull().default("[]"),
  messageCount: integer("message_count").notNull().default(0),
  title: text("title"),
  /** JSON object for arbitrary metadata */
  metadata: text("metadata").default("{}"),
  lastMessageAt: text("last_message_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Per-user key/value memory — working (per-conversation) and persistent (cross-conversation) */
export const agentMemory = sqliteTable(
  "agent_memory",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    conversationId: text("conversation_id"),
    /** "working" = per-conversation, "persistent" = cross-conversation */
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    content: text("content").notNull(),
    reason: text("reason"),
    importance: integer("importance").notNull().default(3),
    category: text("category"),
    expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    uniqueMemory: uniqueIndex("idx_agent_memory_unique").on(
      table.userId,
      table.conversationId,
      table.scope,
      table.key,
    ),
  }),
);
