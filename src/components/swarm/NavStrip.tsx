/**
 * NavStrip -- thin vertical nav on the right edge of the swarm view.
 */

"use client";

interface NavStripProps {
  onToggleLog: () => void;
  logOpen: boolean;
  onReset: () => void;
  messageCount: number;
  hidden?: boolean;
}

/**
 * NavStrip -- fixed right-edge toolbar with stop, log controls.
 *
 * @example
 * ```tsx
 * <NavStrip onToggleLog={toggle} logOpen={logOpen} onReset={reset} messageCount={42} />
 * ```
 */
export function NavStrip({ onToggleLog, logOpen, onReset, messageCount, hidden }: NavStripProps): React.JSX.Element {
  if (hidden) return <></>;

  return (
    <div className="fixed top-16 right-3 z-50 hidden sm:flex flex-col items-center gap-2">
      <NavButton label="Stop and reset" onClick={onReset}>
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
          <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" fill="currentColor" />
        </svg>
      </NavButton>

      <NavButton label={logOpen ? "Close log" : "Protocol log"} onClick={onToggleLog} active={logOpen} badge={messageCount > 0 ? messageCount : undefined}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 6H11M5 8H9M5 10H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </NavButton>
    </div>
  );
}

interface NavButtonProps {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}

function NavButton({ children, label, onClick, active, badge }: NavButtonProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        relative flex items-center justify-center w-8 h-8 rounded-lg
        transition-all duration-150
        ${active
          ? "bg-accent-primary/10 text-accent-primary"
          : "text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
        }
      `}
    >
      {children}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[9px] font-semibold rounded-full bg-accent-primary text-accent-primary-text">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}
