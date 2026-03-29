/**
 * AgentDossier -- popover shown when an agent sphere is clicked in the 3D graph.
 *
 * Shows the selected agent's own work (tasks, critiques, declines) followed by
 * a "Team Activity" section for every sub-agent beneath it.
 */

"use client";

import { DeliverableBody } from "@/components/swarm/DeliverableBody";
import type { AgentViz, AgentVizState, TaskViz } from "@/lib/swarm/agentGraph";

/** Walk the parentAgentId chain to collect every descendant. */
function collectDescendants(
  agentId: string,
  allAgents: AgentViz[],
  visited = new Set<string>(),
): AgentViz[] {
  if (visited.has(agentId)) return [];
  visited.add(agentId);
  const children = allAgents.filter((a) => a.parentAgentId === agentId);
  return children.flatMap((c) => [c, ...collectDescendants(c.id, allAgents, visited)]);
}

const STATE_DOT: Record<AgentVizState, string> = {
  idle: "bg-text-tertiary",
  working: "bg-node-promise animate-dotPulse",
  completed: "bg-node-complete",
  declined: "bg-node-decline",
  critiquing: "bg-accent-primary animate-dotPulse",
};

function depthLabel(depth: number): string {
  if (depth === 1) return "sub-agent";
  if (depth === 2) return "sub-sub-agent";
  return `depth ${depth}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskList({ tasks }: { tasks: TaskViz[] }): React.JSX.Element | null {
  if (tasks.length === 0) return null;
  return (
    <div className="px-4 py-3 space-y-4">
      <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Work</p>
      {tasks.map((task) => (
        <div key={task.intentId} className="space-y-1.5">
          <div className="flex items-start gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
              task.state === "complete" ? "bg-node-complete" :
              task.state === "promised" ? "bg-node-promise animate-dotPulse" :
              "bg-text-tertiary"
            }`} />
            <p className="text-[11px] font-medium text-text-primary leading-snug">{task.content || "Sub-goal"}</p>
          </div>
          {task.promiseReason && (
            <p className="text-[10px] text-text-tertiary ml-3 italic leading-relaxed">Reasoning: {task.promiseReason}</p>
          )}
          {task.resultContent && (
            <div className="ml-3 pl-2 border-l-2 border-border-subtle text-text-primary">
              <DeliverableBody content={task.resultContent} />
            </div>
          )}
          {task.state === "promised" && !task.resultContent && (
            <p className="text-[10px] text-node-promise ml-3 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-node-promise animate-dotPulse" />
              Working...
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function AgentSections({ agent, indentLevel = 0 }: { agent: AgentViz; indentLevel?: number }): React.JSX.Element {
  const indent = indentLevel > 0 ? `ml-${Math.min(indentLevel * 3, 9)}` : "";
  const hasActivity =
    agent.tasks.length > 0 || agent.declines.length > 0 ||
    agent.critiquesReceived.length > 0 || agent.critiquesGiven.length > 0;

  return (
    <div className={indent}>
      <TaskList tasks={agent.tasks} />
      {agent.critiquesReceived.length > 0 && (
        <div className="px-4 py-3 border-t border-border-subtle space-y-2">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Peer Feedback Received</p>
          {agent.critiquesReceived.map((c, i) => (
            <div key={`cr-${i}`} className="space-y-1">
              <p className="text-[10px] font-medium text-accent-primary">{c.reviewerName} on &ldquo;{c.targetSubGoal || "their work"}&rdquo;</p>
              <div className="ml-2 pl-2 border-l border-accent-primary/30 text-text-primary">
                <DeliverableBody content={c.content} />
              </div>
            </div>
          ))}
        </div>
      )}
      {agent.critiquesGiven.length > 0 && (
        <div className="px-4 py-3 border-t border-border-subtle space-y-2">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Peer Reviews Written</p>
          {agent.critiquesGiven.map((c, i) => (
            <div key={`cg-${i}`} className="space-y-1">
              <p className="text-[10px] font-medium text-text-secondary">On {c.targetName}&apos;s &ldquo;{c.targetSubGoal || "work"}&rdquo;</p>
              <div className="ml-2 pl-2 border-l border-border-default text-text-primary">
                <DeliverableBody content={c.content} />
              </div>
            </div>
          ))}
        </div>
      )}
      {agent.declines.length > 0 && (
        <div className="px-4 py-3 border-t border-border-subtle space-y-2">
          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Declined</p>
          {agent.declines.map((d, i) => (
            <div key={`dec-${i}`} className="space-y-0.5">
              <p className="text-[10px] font-medium text-node-decline">{d.subGoalContent}</p>
              <p className="text-[10px] text-text-tertiary italic ml-2 leading-relaxed">{d.reason}</p>
            </div>
          ))}
        </div>
      )}
      {!hasActivity && (
        <div className="px-4 py-3"><p className="text-[10px] text-text-tertiary">No activity yet.</p></div>
      )}
    </div>
  );
}

function DescendantCard({ agent }: { agent: AgentViz }): React.JSX.Element {
  const indentLeft = agent.depth > 1 ? `ml-${Math.min((agent.depth - 1) * 3, 9)}` : "";
  return (
    <div className={`border border-border-subtle rounded-lg overflow-hidden ${indentLeft}`}>
      <div className="px-3 py-2 bg-surface-secondary/40 flex items-start gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${STATE_DOT[agent.state]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-text-primary truncate">{agent.name}</span>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-surface-elevated border border-border-subtle text-text-tertiary shrink-0">{depthLabel(agent.depth)}</span>
            <span className="text-[9px] font-mono text-text-tertiary uppercase shrink-0">{agent.state}</span>
          </div>
          {agent.expertise && <p className="text-[10px] text-text-tertiary leading-snug mt-0.5">{agent.expertise}</p>}
        </div>
      </div>
      <AgentSections agent={agent} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AgentDossierProps {
  agent: AgentViz;
  allAgents: AgentViz[];
  onClose: () => void;
}

/**
 * AgentDossier -- floating popover anchored to the bottom-left.
 *
 * @example
 * ```tsx
 * <AgentDossier agent={selectedAgent} allAgents={graph.agents} onClose={close} />
 * ```
 */
export function AgentDossier({ agent, allAgents, onClose }: AgentDossierProps): React.JSX.Element {
  const descendants = collectDescendants(agent.id, allAgents);
  const completedTasks = agent.tasks.filter((t) => t.state === "complete").length;

  return (
    <div className="absolute bottom-4 left-4 sm:left-6 w-[400px] max-w-[calc(100vw-2rem)] max-h-[72vh] flex flex-col animate-fadeSlideIn z-10">
      <div className="rounded-xl border border-border-default bg-surface-elevated/95 backdrop-blur-sm shadow-sm flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle shrink-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="min-w-0 flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${STATE_DOT[agent.state]}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{agent.name}</p>
                <p className="text-[10px] font-mono text-text-tertiary uppercase mt-0.5">
                  {agent.state}
                  {agent.tasks.length > 0 && <span className="ml-1 text-text-secondary"> · {completedTasks}/{agent.tasks.length} tasks</span>}
                  {descendants.length > 0 && <span className="ml-1 text-text-secondary"> · {descendants.length} sub-agent{descendants.length !== 1 ? "s" : ""}</span>}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors mt-0.5" aria-label="Close agent dossier">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-medium text-text-primary">Expertise: </span>{agent.expertise}
          </p>
          {agent.style && <p className="text-xs text-text-tertiary leading-relaxed mt-1 italic">&ldquo;{agent.style}&rdquo;</p>}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <AgentSections agent={agent} />
          {descendants.length > 0 && (
            <div className="border-t border-border-default px-4 py-3 space-y-3">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                Team Activity <span className="ml-1.5 font-normal normal-case text-text-tertiary">({descendants.length} agent{descendants.length !== 1 ? "s" : ""})</span>
              </p>
              {descendants.map((desc) => <DescendantCard key={desc.id} agent={desc} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
