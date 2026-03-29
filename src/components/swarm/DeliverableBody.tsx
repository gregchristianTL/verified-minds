/**
 * Renders swarm synthesis markdown with GFM (tables, strikethrough, task lists,
 * autolinks) via react-markdown + remark-gfm.
 */

'use client'

import { useMemo } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DeliverableBodyProps {
  /** Raw synthesis markdown */
  content: string
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-semibold text-text-primary tracking-tight mt-4 mb-2 first:mt-0 scroll-mt-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-text-primary tracking-tight mt-3 mb-1.5 scroll-mt-4">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-text-secondary mt-3 mb-1 scroll-mt-4">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-semibold text-text-secondary mt-2 mb-1">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-text-primary leading-relaxed wrap-break-word mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-4 space-y-1 text-sm text-text-primary mb-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 space-y-1 text-sm text-text-primary mb-2">{children}</ol>
  ),
  li: ({ children }) => <li className="wrap-break-word">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border-default pl-3 my-2 text-text-secondary text-sm italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-accent-primary underline underline-offset-2 hover:opacity-90"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border-subtle" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-border-subtle">
      <table className="min-w-full text-xs text-left border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-secondary">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2 py-1.5 font-semibold text-text-primary border-b border-border-default">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 border-b border-border-subtle text-text-primary wrap-break-word">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="even:bg-surface-primary/50">{children}</tr>,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-surface-secondary p-3 text-xs font-mono text-text-primary border border-border-subtle">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className)
    if (isBlock) {
      return (
        <code className={`block whitespace-pre-wrap wrap-break-word ${className ?? ''}`} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="text-[0.9em] bg-surface-secondary px-1 py-0.5 rounded font-mono text-text-primary"
        {...props}
      >
        {children}
      </code>
    )
  },
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
  del: ({ children }) => <del className="text-text-tertiary line-through">{children}</del>,
  input: ({ checked, ...props }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      readOnly
      className="mr-1 align-middle rounded border-border-default"
      {...props}
    />
  ),
}

/**
 * Renders full markdown + GFM for the final swarm deliverable.
 *
 * @example
 * ```tsx
 * <DeliverableBody content={markdown} />
 * ```
 */
export function DeliverableBody({ content }: DeliverableBodyProps): React.JSX.Element {
  const trimmed = useMemo(() => content.trim(), [content])

  if (!trimmed) {
    return <p className="text-sm text-text-tertiary">No content.</p>
  }

  return (
    <div className="deliverable-markdown text-text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  )
}
