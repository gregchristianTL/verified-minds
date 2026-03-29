/**
 * Build an agent-centric graph model from intent-space messages (manifest,
 * sub-intents, promises, completes, declines, critiques), and lay out 3D positions.
 *
 * Supports recursive sub-swarms: sub-manifests are detected by checking whether
 * a manifest's parentId is a known sub-goal intentId from a parent swarm.
 * Sub-agents are linked to their parent agent via parentAgentId.
 */

import * as THREE from 'three'

import type { StoredMessage } from '@/lib/swarm/types'

export type AgentVizState = 'idle' | 'working' | 'completed' | 'declined' | 'critiquing'

export interface TaskViz {
  intentId: string
  content: string
  state: 'pending' | 'promised' | 'complete'
  assignedAgentId: string | null
  /** COMPLETE payload text when finished */
  resultContent: string
  /** Why the agent accepted this task (from PROMISE payload) */
  promiseReason: string
  /** True if this sub-goal spawned its own sub-swarm */
  delegatable: boolean
}

export interface CritiqueViz {
  /** Who wrote the critique */
  reviewerName: string
  /** Whose work was critiqued */
  targetName: string
  /** The sub-goal being critiqued */
  targetSubGoal: string
  /** Full critique text */
  content: string
}

export interface DeclineViz {
  /** The sub-goal that was declined */
  subGoalContent: string
  /** The reason text */
  reason: string
}

export interface AgentViz {
  id: string
  name: string
  expertise: string
  style: string
  state: AgentVizState
  tasks: TaskViz[]
  declinedIntentIds: string[]
  /** Full decline reasons with sub-goal context */
  declines: DeclineViz[]
  /** Critiques this agent wrote about others */
  critiquesGiven: CritiqueViz[]
  /** Critiques others wrote about this agent's work */
  critiquesReceived: CritiqueViz[]
  /** Nesting depth: 0 = top-level, 1 = sub-agent, etc. */
  depth: number
  /** ID of the parent agent who spawned this sub-swarm, or null for top-level */
  parentAgentId: string | null
}

export type GraphSelection =
  | { kind: 'root'; intentId: string; content: string }
  | { kind: 'agent'; agent: AgentViz }

export interface AgentGraphModel {
  rootIntentId: string
  rootContent: string
  agents: AgentViz[]
  unassignedTasks: TaskViz[]
  declinePairs: Array<{ agentId: string; intentId: string; reason: string }>
}

interface ManifestAgent {
  id: string
  name: string
  expertise: string
  style: string
}

interface ManifestRecord {
  intentId: string
  parentId: string
  agents: ManifestAgent[]
  depth: number
}

/** Extract manifest records from sorted messages. */
function parseManifests(sorted: StoredMessage[]): ManifestRecord[] {
  const manifests: ManifestRecord[] = []
  for (const m of sorted) {
    if (m.type !== 'INTENT' || !m.intentId) continue
    const p = m.payload as Record<string, unknown>
    if (!p.isManifest) continue
    const man = p.manifest as { agents?: ManifestAgent[] } | undefined
    if (!man?.agents?.length) continue
    manifests.push({
      intentId: m.intentId,
      parentId: m.parentId,
      agents: man.agents,
      depth: typeof p.depth === 'number' ? p.depth : 0,
    })
  }
  return manifests
}

/** Resolve the human root intent id and content from messages. */
function resolveRoot(
  sorted: StoredMessage[],
  allManifests: ManifestRecord[],
): { rootIntentId: string; rootContent: string } {
  const humanRootMsgs = sorted.filter(
    (m) => m.type === 'INTENT' && m.parentId === 'root' && m.senderId === 'human'
  )
  const rootMsg = humanRootMsgs.at(-1)

  let rootIntentId: string
  let rootContent: string

  if (rootMsg?.intentId) {
    rootIntentId = rootMsg.intentId
    rootContent = String((rootMsg.payload as Record<string, unknown>)?.content ?? '') || 'Intent'
  } else {
    const latestManifest = allManifests.at(-1)!
    rootIntentId = latestManifest.parentId
    const parentMsg = sorted.find(
      (m) => m.type === 'INTENT' && m.intentId === rootIntentId
    )
    rootContent = parentMsg
      ? String((parentMsg.payload as Record<string, unknown>)?.content ?? '') || 'Intent'
      : 'Intent'
  }

  const rootManifest = allManifests.find((m) => m.parentId === rootIntentId)
  if (!rootManifest) {
    const fallback = allManifests.find((m) => m.depth === 0) ?? allManifests[0]
    rootIntentId = fallback.parentId
  }

  return { rootIntentId, rootContent }
}

type SubGoalEntry = { content: string; delegatable: boolean; parentIntentId: string }

/** Collect orchestrator-posted sub-goals from messages. */
function collectSubGoals(sorted: StoredMessage[]): Map<string, SubGoalEntry> {
  const subGoals = new Map<string, SubGoalEntry>()
  for (const m of sorted) {
    if (m.type !== 'INTENT' || !m.intentId) continue
    const p = m.payload as Record<string, unknown>
    if (m.senderId !== 'swarm-orchestrator') continue
    if (
      p.isManifest || p.isPhaseMarker || p.isSummary ||
      p.isSynthesis || p.isCritique || p.isRunRecord
    ) continue
    subGoals.set(m.intentId, {
      content: String(p.content ?? ''),
      delegatable: Boolean(p.delegatable),
      parentIntentId: m.parentId,
    })
  }
  return subGoals
}

/** Build a TaskViz map for sub-goals scoped to a specific parent intent. */
function buildTaskMap(
  allSubGoals: Map<string, SubGoalEntry>,
  manifestParentId: string,
): Map<string, TaskViz> {
  const taskMap = new Map<string, TaskViz>()
  for (const [id, goal] of allSubGoals) {
    if (goal.parentIntentId !== manifestParentId) continue
    taskMap.set(id, {
      intentId: id,
      content: goal.content,
      state: 'pending',
      assignedAgentId: null,
      resultContent: '',
      promiseReason: '',
      delegatable: goal.delegatable,
    })
  }
  return taskMap
}

/** Apply PROMISE / COMPLETE / decline messages to a task map and collect decline pairs. */
function applyMessagesToTasks(
  sorted: StoredMessage[],
  taskMap: Map<string, TaskViz>,
  declinePairs: Array<{ agentId: string; intentId: string; reason: string }>,
): void {
  for (const m of sorted) {
    const sid = m.intentId ?? m.parentId
    if (m.type === 'PROMISE' && sid) {
      const t = taskMap.get(sid)
      if (!t || t.state === 'complete') continue
      t.state = 'promised'
      t.assignedAgentId = m.senderId
      const promiseContent = String((m.payload as Record<string, unknown>)?.content ?? '')
      const colonIdx = promiseContent.indexOf(': ')
      t.promiseReason = colonIdx >= 0 ? promiseContent.slice(colonIdx + 2) : promiseContent
    }
    if (m.type === 'COMPLETE' && sid) {
      const t = taskMap.get(sid)
      if (!t) continue
      t.state = 'complete'
      t.assignedAgentId = m.senderId
      t.resultContent = String((m.payload as Record<string, unknown>)?.content ?? '')
    }
    if (m.type === 'INTENT') {
      const p = m.payload as Record<string, unknown>
      const content = String(p.content ?? '')
      if (
        m.senderId !== 'swarm-orchestrator' &&
        m.senderId !== 'human' &&
        content.includes('declined:') &&
        taskMap.has(m.parentId)
      ) {
        const declinedIdx = content.indexOf('declined:')
        const reason = declinedIdx >= 0 ? content.slice(declinedIdx + 10).trim() : content
        declinePairs.push({ agentId: m.senderId, intentId: m.parentId, reason })
      }
    }
  }
}

/** Extract scoped critique data for a manifest. */
function extractCritiques(
  sorted: StoredMessage[],
  swarmParentId: string,
  manifestAgents: ManifestAgent[],
): { critiqueAgentIds: Set<string>; scopeCritiques: CritiqueViz[] } {
  const critiqueAgentIds = new Set<string>()
  const scopeCritiques: CritiqueViz[] = []

  for (const m of sorted) {
    const p = m.payload as Record<string, unknown>
    if (m.type !== 'INTENT' || !p.isCritique || m.senderId === 'human') continue
    if (m.parentId !== swarmParentId) continue
    critiqueAgentIds.add(m.senderId)
    const content = String(p.content ?? '')
    const critiquesIdx = content.indexOf('critiques ')
    const colonAfterTarget = critiquesIdx >= 0
      ? content.indexOf(': ', critiquesIdx + 10)
      : -1
    const critiqueText = colonAfterTarget >= 0
      ? content.slice(colonAfterTarget + 2).trim()
      : content
    const senderAgent = manifestAgents.find((a) => a.id === m.senderId)
    scopeCritiques.push({
      reviewerName: senderAgent?.name ?? m.senderId,
      targetName: String(p.reviewTarget ?? 'Unknown'),
      targetSubGoal: String(p.reviewSubIntent ?? ''),
      content: critiqueText,
    })
  }

  return { critiqueAgentIds, scopeCritiques }
}

/**
 * Derive agent-centric graph from messages, or null if no swarm manifest yet.
 * Handles nested sub-swarm manifests by linking sub-agents to parent agents.
 */
export function extractAgentGraph(messages: StoredMessage[]): AgentGraphModel | null {
  const sorted = [...messages].sort((a, b) => a.seq - b.seq)

  const allManifests = parseManifests(sorted)
  if (allManifests.length === 0) return null

  const { rootIntentId, rootContent } = resolveRoot(sorted, allManifests)
  const allSubGoals = collectSubGoals(sorted)

  const subGoalOwner = new Map<string, string>()
  for (const m of sorted) {
    const sid = m.intentId ?? m.parentId
    if (m.type === 'PROMISE' && sid) subGoalOwner.set(sid, m.senderId)
  }

  const declinePairs: Array<{ agentId: string; intentId: string; reason: string }> = []
  const allAgents: AgentViz[] = []
  const sortedManifests = [...allManifests].sort((a, b) => a.depth - b.depth)

  for (const manifest of sortedManifests) {
    const taskMap = buildTaskMap(allSubGoals, manifest.parentId)
    applyMessagesToTasks(sorted, taskMap, declinePairs)

    const allTasks = Array.from(taskMap.values())
    const { critiqueAgentIds, scopeCritiques } = extractCritiques(sorted, manifest.parentId, manifest.agents)

    const parentAgentId = manifest.parentId === rootIntentId
      ? null
      : (subGoalOwner.get(manifest.parentId) ?? null)

    for (const a of manifest.agents) {
      const tasks = allTasks.filter((t) => t.assignedAgentId === a.id)
      const agentDeclines = declinePairs.filter((d) => d.agentId === a.id)

      const hasWorking = tasks.some((t) => t.state === 'promised')
      const hasComplete = tasks.some((t) => t.state === 'complete')
      const hasCritique = critiqueAgentIds.has(a.id)
      const onlyDeclines = agentDeclines.length > 0 && tasks.length === 0

      let state: AgentVizState = 'idle'
      if (hasWorking) state = 'working'
      else if (hasCritique) state = 'critiquing'
      else if (hasComplete) state = 'completed'
      else if (onlyDeclines) state = 'declined'

      allAgents.push({
        id: a.id, name: a.name, expertise: a.expertise, style: a.style,
        state, tasks,
        declinedIntentIds: agentDeclines.map((d) => d.intentId),
        declines: agentDeclines.map((d) => ({
          subGoalContent: allSubGoals.get(d.intentId)?.content ?? d.intentId,
          reason: d.reason,
        })),
        critiquesGiven: scopeCritiques.filter((c) => c.reviewerName === a.name),
        critiquesReceived: scopeCritiques.filter((c) => c.targetName === a.name),
        depth: manifest.depth,
        parentAgentId,
      })
    }
  }

  if (allAgents.length === 0) return null

  const rootScopeTasks = buildTaskMap(allSubGoals, rootIntentId)
  applyMessagesToTasks(sorted, rootScopeTasks, [])
  const unassignedTasks = Array.from(rootScopeTasks.values()).filter(
    (t) => t.state === 'pending' && !t.assignedAgentId
  )

  return { rootIntentId, rootContent, agents: allAgents, unassignedTasks, declinePairs }
}

/** Graph node id prefixes */
export const ROOT_NODE_ID = 'root'

export function agentNodeId(agentId: string): string {
  return `agent:${agentId}`
}

export function taskNodeId(intentId: string): string {
  return `task:${intentId}`
}

export interface LayoutEdge {
  fromId: string
  toId: string
  kind: 'root-agent' | 'agent-subagent'
}

const BASE_RING_RADIUS = 6
const MIN_AGENT_SPACING = 2.4
const MIN_SUB_ORBIT_RADIUS = 2.4
const DEPTH_Y_STEP = 2.0

/**
 * Compute 3D positions and edges for an agent graph.
 *
 * Top-level agents (depth 0) orbit the root in a ring.
 * Sub-agents (depth > 0) orbit their parent agent in a ring that scales
 * with the number of children, preventing overlap.
 */
export function layoutAgentGraphPositions(model: AgentGraphModel): {
  positions: Map<string, THREE.Vector3>
  edges: LayoutEdge[]
} {
  const positions = new Map<string, THREE.Vector3>()
  const edges: LayoutEdge[] = []

  positions.set(ROOT_NODE_ID, new THREE.Vector3(0, 0, 0))

  const topLevelAgents = model.agents.filter((a) => a.depth === 0)
  const n = topLevelAgents.length
  const radiusForSpacing = (n * MIN_AGENT_SPACING) / (2 * Math.PI)
  const radius = Math.max(BASE_RING_RADIUS, radiusForSpacing)

  for (let i = 0; i < n; i++) {
    const agent = topLevelAgents[i]
    const angle = (i / Math.max(n, 1)) * Math.PI * 2
    positions.set(agentNodeId(agent.id), new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    ))
    edges.push({ fromId: ROOT_NODE_ID, toId: agentNodeId(agent.id), kind: 'root-agent' })
  }

  const maxDepth = model.agents.reduce((acc, a) => Math.max(acc, a.depth), 0)
  const orphanRingRadius = radius + 3

  for (let depth = 1; depth <= maxDepth; depth++) {
    const agentsAtDepth = model.agents.filter((a) => a.depth === depth)

    const linked: AgentViz[] = []
    const orphaned: AgentViz[] = []
    for (const sa of agentsAtDepth) {
      const parentInPositions = sa.parentAgentId !== null && positions.has(agentNodeId(sa.parentAgentId))
      if (parentInPositions) {
        linked.push(sa)
      } else {
        orphaned.push(sa)
      }
    }

    const byParent = new Map<string, AgentViz[]>()
    for (const sa of linked) {
      const pid = sa.parentAgentId!
      if (!byParent.has(pid)) byParent.set(pid, [])
      byParent.get(pid)!.push(sa)
    }

    for (const [parentId, children] of byParent) {
      const parentPos = positions.get(agentNodeId(parentId))!
      const m = children.length
      const orbitRadius = Math.max(MIN_SUB_ORBIT_RADIUS, (m * 1.6) / (2 * Math.PI))

      for (let j = 0; j < m; j++) {
        const child = children[j]
        const angle = (j / Math.max(m, 1)) * Math.PI * 2
        positions.set(agentNodeId(child.id), new THREE.Vector3(
          parentPos.x + Math.cos(angle) * orbitRadius,
          parentPos.y + DEPTH_Y_STEP,
          parentPos.z + Math.sin(angle) * orbitRadius,
        ))
        edges.push({ fromId: agentNodeId(parentId), toId: agentNodeId(child.id), kind: 'agent-subagent' })
      }
    }

    if (orphaned.length > 0) {
      for (let j = 0; j < orphaned.length; j++) {
        const child = orphaned[j]
        const angle = (j / Math.max(orphaned.length, 1)) * Math.PI * 2
        positions.set(agentNodeId(child.id), new THREE.Vector3(
          Math.cos(angle) * orphanRingRadius,
          depth * DEPTH_Y_STEP,
          Math.sin(angle) * orphanRingRadius,
        ))
        edges.push({ fromId: ROOT_NODE_ID, toId: agentNodeId(child.id), kind: 'agent-subagent' })
      }
    }
  }

  return { positions, edges }
}
