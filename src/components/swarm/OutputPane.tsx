/**
 * OutputPane -- a resizable right-edge panel that slides in when the swarm
 * completes its synthesis, showing the final deliverable in full markdown.
 */

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

import { DeliverableBody } from '@/components/swarm/DeliverableBody'

const MIN_WIDTH = 320
const MAX_WIDTH = 680
const DEFAULT_WIDTH = 480

/** Format milliseconds into a human-friendly duration string. */
function formatElapsed(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`
}

export interface SwarmStats {
  total: number
  completed: number
  agents: number
  critiques?: number
  elapsedMs?: number
}

interface OutputPaneProps {
  open: boolean
  onClose: () => void
  content: string | null
  stats: SwarmStats | null
}

function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-md border border-border-default
                 text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
      aria-label={copied ? 'Copied to clipboard' : 'Copy deliverable'}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * OutputPane -- auto-sliding panel for the final swarm deliverable.
 */
export function OutputPane({ open, onClose, content, stats }: OutputPaneProps): React.JSX.Element {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(DEFAULT_WIDTH)

  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = width
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [width])

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const dx = dragStartX.current - e.clientX
    const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartWidth.current + dx))
    setWidth(next)
  }, [])

  const onDragEnd = useCallback(() => {
    dragging.current = false
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="output-pane"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ width }}
          className="fixed top-0 right-0 bottom-0 z-30 flex flex-col
                     bg-surface-elevated border-l border-border-default shadow-lg"
        >
          <div
            className="output-pane-handle"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            aria-label="Resize pane"
          />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-connected" />
              <h2 className="text-sm font-semibold text-text-primary tracking-tight">
                Deliverable
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {content && <CopyButton text={content} />}
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           text-text-tertiary hover:bg-surface-secondary hover:text-text-primary
                           transition-colors"
                aria-label="Close output pane"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1L11 11M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 text-text-primary">
            {content ? (
              <DeliverableBody content={content} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <p className="text-sm text-text-secondary">No output yet</p>
                <p className="text-xs text-text-tertiary">
                  The deliverable will appear here when the swarm finishes.
                </p>
              </div>
            )}
          </div>

          {/* Stats footer */}
          {stats && (
            <div className="shrink-0 px-4 py-2.5 border-t border-border-subtle bg-surface-secondary/60">
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                {stats.completed}/{stats.total} sub-goals explored
                {' · '}{stats.agents} agent{stats.agents !== 1 ? 's' : ''}
                {typeof stats.critiques === 'number' && stats.critiques > 0
                  ? ` · ${stats.critiques} peer critique${stats.critiques !== 1 ? 's' : ''}`
                  : ''}
                {typeof stats.elapsedMs === 'number' && stats.elapsedMs > 0
                  ? ` · ${formatElapsed(stats.elapsedMs)}`
                  : ''}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
