/**
 * Extracts the final deliverable and run status from the message stream.
 */

import type { StoredMessage } from '@/lib/swarm/types'

/** Stats attached to the synthesis message. */
export interface SwarmStats {
  total: number
  completed: number
  agents: number
  critiques?: number
  elapsedMs?: number
}

/** Subset of RunRecord fields used by the UI for live status display. */
export interface RunStatus {
  status: string
  agentCount?: number
  subGoalCount?: number
  completedCount?: number
  elapsedMs?: number
}

/**
 * Extract the final deliverable text and stats from the message stream.
 */
export function extractDeliverable(messages: StoredMessage[]): {
  content: string | null
  stats: SwarmStats | null
} {
  let content: string | null = null
  let stats: SwarmStats | null = null

  for (const m of messages) {
    const p = m.payload as Record<string, unknown>
    if (m.type === 'INTENT' && (p.isSummary || p.isSynthesis)) {
      content = String(p.content ?? '') || null
      if (p.stats) {
        stats = p.stats as SwarmStats
      }
    }
  }
  return { content, stats }
}

/**
 * Extract the latest run record from the message stream for live status display.
 */
export function extractLatestRunStatus(messages: StoredMessage[]): RunStatus | null {
  let latest: RunStatus | null = null
  for (const m of messages) {
    const p = m.payload as Record<string, unknown>
    if (p?.isRunRecord && p.run) {
      latest = p.run as RunStatus
    }
  }
  return latest
}
