"use client";

interface ProgressBarProps {
  progress: number;
  itemCount: number;
}

const PHASES = [
  { min: 0, label: "Getting to know you" },
  { min: 15, label: "Exploring your expertise" },
  { min: 40, label: "Finding the gold" },
  { min: 70, label: "Refining your agent" },
  { min: 90, label: "Almost there..." },
  { min: 100, label: "Your agent is ready!" },
];

function getPhaseLabel(progress: number): string {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (progress >= PHASES[i].min) return PHASES[i].label;
  }
  return PHASES[0].label;
}

export default function ProgressBar({
  progress,
  itemCount,
}: ProgressBarProps): React.ReactElement {
  const clamped = Math.min(progress, 100);
  const isDone = clamped >= 100;

  return (
    <div className="w-72 space-y-2.5">
      {/* Phase label */}
      <p className="text-center text-sm font-medium text-[var(--foreground)]">
        {getPhaseLabel(clamped)}
      </p>

      {/* Bar */}
      <div className="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: isDone ? "var(--success)" : "var(--accent)",
          }}
        />
      </div>

      {/* Count */}
      <p className="text-center text-xs text-[var(--muted)]">
        {itemCount > 0
          ? `${itemCount} insight${itemCount !== 1 ? "s" : ""} captured`
          : "Listening..."}
      </p>
    </div>
  );
}
