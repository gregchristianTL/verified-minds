/** Status of an expert profile through its lifecycle */
export type ProfileStatus = "extracting" | "live";

/** Confidence level for a knowledge domain */
export type ConfidenceLevel = "low" | "medium" | "high";

/** Extraction checklist phase */
export type ExtractionPhase =
  | "domain_id"
  | "boundaries"
  | "unique_signal"
  | "decision_frameworks"
  | "persona"
  | "verification";

/** A single extracted knowledge item stored during interview */
export interface KnowledgeItem {
  id: string;
  domain: string;
  topic: string;
  content: string;
  phase: ExtractionPhase;
  createdAt: string;
}

/** Confidence assessment for a specific domain */
export interface DomainConfidence {
  domain: string;
  level: ConfidenceLevel;
  evidence: string;
  gaps: string[];
}

/** Expert profile as returned to clients */
export interface ExpertProfile {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  confidenceMap: Record<string, number>;
  knowledgeItemCount: number;
  adinAgentId: string | null;
  status: ProfileStatus;
  queryPrice: string;
  totalEarnings: string;
  createdAt: string;
}

/** Single earnings transaction */
export interface EarningsEntry {
  id: string;
  querySummary: string | null;
  domainTag: string | null;
  amount: number;
  txHash: string | null;
  createdAt: string;
}

/** Marketplace listing for an expert */
export interface MarketplaceListing {
  id: string;
  displayName: string;
  bio: string | null;
  domains: string[];
  queryPrice: string;
  adinAgentId: string;
}
