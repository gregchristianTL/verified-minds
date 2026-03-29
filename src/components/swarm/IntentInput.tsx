/**
 * IntentInput -- chat-style input dock at the bottom of the viewport.
 * Volcanic dark theme with glassmorphism styling.
 */

'use client'

import { useCallback, useRef, useState } from 'react'

interface IntentInputProps {
  onSubmit: (content: string) => Promise<void>
  disabled?: boolean
}

/**
 * IntentInput -- bottom-docked text input for declaring intents.
 */
export function IntentInput({ onSubmit, disabled }: IntentInputProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(trimmed)
      setValue('')
      inputRef.current?.focus()
    } catch (err: unknown) {
      console.error('Failed to post intent:', err)
    } finally {
      setSubmitting(false)
    }
  }, [value, submitting, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-5 pt-2">
      <div
        className={`
          relative
          rounded-2xl border border-border-default bg-surface-elevated
          px-4 py-3 shadow-sm
          transition-all duration-200
          focus-within:border-accent-primary/40 focus-within:shadow-md focus-within:shadow-accent-primary/5
          ${disabled ? 'opacity-40 pointer-events-none' : ''}
        `}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to do?"
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent text-sm leading-relaxed
                     text-text-primary placeholder:text-text-tertiary
                     outline-none max-h-32 scrollbar-hidden text-center pr-9"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />

        <button
          onClick={handleSubmit}
          disabled={!value.trim() || submitting || disabled}
          className={`
            absolute right-3 bottom-3
            flex items-center justify-center
            w-7 h-7 rounded-full
            transition-all duration-200
            ${
              value.trim()
                ? 'bg-accent-primary text-accent-primary-text hover:bg-accent-primary-hover scale-100'
                : 'bg-surface-secondary text-text-tertiary scale-95'
            }
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
          aria-label="Send intent"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 13V3M8 3L3 8M8 3L13 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-text-tertiary">
        Enter to send &middot; Shift+Enter for new line
      </p>
    </div>
  )
}
