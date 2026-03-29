/**
 * React hook that manages the SSE connection to the intent space
 * and maintains the tree of messages in state.
 *
 * Connection strategy:
 * - Page refresh: reads maxSeenSeq from sessionStorage and connects with
 *   since=<stored> so old history is never replayed (clean-slate behavior).
 * - First-ever visit (no sessionStorage): since=0, full history.
 * - Drop + reconnect: since=maxSeenSeq (in-memory), no duplicates.
 * - reset(): clears frontend state, persists maxSeenSeq so the next
 *   reconnect only picks up new messages.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ConnectionStatus,
  ITPMessageType,
  StoredMessage,
  TreeNode,
} from './types'

const SESSION_KEY = 'vm-swarm-maxSeq'

/**
 * Read the last-seen seq from sessionStorage (client-only, SSR-safe).
 * Returns 0 when no stored value exists (first-ever visit).
 */
function readStoredSeq(): number {
  if (typeof window === 'undefined') return 0
  try {
    const v = sessionStorage.getItem(SESSION_KEY)
    return v ? parseInt(v, 10) || 0 : 0
  } catch {
    return 0
  }
}

/**
 * Persist maxSeenSeq to sessionStorage so the next page refresh
 * knows where to resume from (skipping old history).
 */
function writeStoredSeq(seq: number): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, String(seq))
  } catch {
    // quota exceeded -- non-critical
  }
}

interface UseIntentSpaceReturn {
  /** Flat list of all messages received */
  messages: StoredMessage[]
  /** Root-level tree nodes for visualization */
  tree: TreeNode[]
  /** Current connection status */
  status: ConnectionStatus
  /** Post a new intent */
  postIntent: (content: string, parentId?: string) => Promise<void>
  /** Clear local state */
  reset: () => void
}

/**
 * Build a tree from a flat list of stored messages.
 */
function buildTree(messages: StoredMessage[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const m of messages) {
    if (m.type === 'INTENT' && m.intentId) {
      if (!nodeMap.has(m.intentId)) {
        nodeMap.set(m.intentId, {
          id: m.intentId,
          type: m.type as ITPMessageType,
          content: m.payload?.content ?? '',
          senderId: m.senderId,
          parentId: m.parentId,
          seq: m.seq,
          timestamp: m.timestamp,
          children: [],
        })
      }
    }
  }

  for (const m of messages) {
    if (m.type !== 'INTENT' && m.type !== 'SCAN_RESULT') {
      const nodeId = m.promiseId ?? `${m.type}-${m.seq}`
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          type: m.type as ITPMessageType,
          content: m.payload?.content ?? m.payload?.reason ?? '',
          senderId: m.senderId,
          parentId: m.parentId,
          seq: m.seq,
          timestamp: m.timestamp,
          children: [],
        })
      }
    }
  }

  for (const node of nodeMap.values()) {
    if (node.parentId === 'root' || !nodeMap.has(node.parentId)) {
      roots.push(node)
    } else {
      const parent = nodeMap.get(node.parentId)
      if (parent && !parent.children.some((c) => c.id === node.id)) {
        parent.children.push(node)
      }
    }
  }

  const sortBySeq = (a: TreeNode, b: TreeNode): number => a.seq - b.seq
  roots.sort(sortBySeq)
  for (const node of nodeMap.values()) {
    node.children.sort(sortBySeq)
  }

  return roots
}

/**
 * Manage the SSE connection to the intent space and maintain message state.
 */
export function useIntentSpace(): UseIntentSpaceReturn {
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)

  const seenSeqs = useRef(new Set<number>())

  const storedSeq = readStoredSeq()
  const resetAfterSeq = useRef<number>(0)
  const maxSeenSeq = useRef<number>(storedSeq)
  const reconnectDelay = useRef(1000)

  const addMessages = useCallback((newMsgs: StoredMessage[]) => {
    setMessages((prev) => {
      const unseen = newMsgs.filter((m) => {
        if (m.senderId === 'intent-space') return false
        if (m.seq <= resetAfterSeq.current) return false
        if (seenSeqs.current.has(m.seq)) return false
        seenSeqs.current.add(m.seq)
        if (m.seq > maxSeenSeq.current) {
          maxSeenSeq.current = m.seq
          writeStoredSeq(m.seq)
        }
        return true
      })
      if (unseen.length === 0) return prev
      const updated = [...prev, ...unseen]
      setTree(buildTree(updated))
      return updated
    })
  }, [])

  const connectSSE = useCallback(() => {
    eventSourceRef.current?.close()
    setStatus('reconnecting')

    const since = maxSeenSeq.current

    const es = new EventSource(`/api/swarm/stream?since=${since}`)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setStatus('connected')
      reconnectDelay.current = 1000
    })

    es.addEventListener('message', (e: MessageEvent<string>) => {
      try {
        const msg: StoredMessage = JSON.parse(e.data)
        addMessages([msg])
      } catch {
        // skip malformed
      }
    })

    es.addEventListener('scan_result', (e: MessageEvent<string>) => {
      try {
        const result = JSON.parse(e.data) as { messages?: StoredMessage[] }
        if (Array.isArray(result.messages)) {
          addMessages(result.messages)
        }
      } catch {
        // skip malformed
      }
    })

    es.onerror = () => {
      setStatus('disconnected')
      es.close()
      eventSourceRef.current = null
      const delay = reconnectDelay.current
      reconnectDelay.current = Math.min(delay * 2, 30_000)
      setTimeout(connectSSE, delay)
    }
  }, [addMessages])

  useEffect(() => {
    connectSSE()
    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [connectSSE])

  const postIntent = useCallback(async (content: string, parentId?: string) => {
    const res = await fetch('/api/swarm/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, parentId }),
    })
    if (!res.ok) {
      const err = await res.json() as { error?: string }
      throw new Error(err.error ?? 'Failed to post intent')
    }
  }, [])

  const reset = useCallback(() => {
    setMessages((prev) => {
      const maxSeq = prev.reduce((acc, m) => Math.max(acc, m.seq), maxSeenSeq.current)
      resetAfterSeq.current = maxSeq
      maxSeenSeq.current = maxSeq
      writeStoredSeq(maxSeq)
      return []
    })
    seenSeqs.current.clear()
    setTree([])
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    connectSSE()
  }, [connectSSE])

  return { messages, tree, status, postIntent, reset }
}
