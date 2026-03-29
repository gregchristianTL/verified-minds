/**
 * Swarm page -- orchestrates the 3D agent graph, intent input, output pane,
 * activity toasts, agent dossier, message log, and status HUD.
 *
 * Connects to the Intent Space via SSE and provides full real-time
 * visibility into the swarm's work.
 */

"use client";

import { useCallback, useMemo, useState } from "react";

import { AgentDossier } from "@/components/swarm/AgentDossier";
import { AgentToastStack } from "@/components/swarm/AgentToastStack";
import { IntentTree, type IntentGraphSelection } from "@/components/swarm/IntentTree";
import { IntentInput } from "@/components/swarm/IntentInput";
import { MessageLogDrawer } from "@/components/swarm/MessageLogDrawer";
import { NavStrip } from "@/components/swarm/NavStrip";
import { OutputPane } from "@/components/swarm/OutputPane";
import { extractAgentGraph } from "@/lib/swarm/agentGraph";
import { extractDeliverable, extractLatestRunStatus } from "@/lib/swarm/extractDeliverable";
import { useIntentSpace } from "@/lib/swarm/useIntentSpace";

/**
 * SwarmPage -- full-screen swarm visualization and orchestration UI.
 */
export default function SwarmPage(): React.JSX.Element {
  const { messages, tree, status, postIntent, reset } = useIntentSpace();

  const [graphSelection, setGraphSelection] = useState<IntentGraphSelection | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);

  const { content: deliverableContent, stats: deliverableStats } = useMemo(
    () => extractDeliverable(messages),
    [messages],
  );

  const runStatus = useMemo(() => extractLatestRunStatus(messages), [messages]);

  const graph = useMemo(() => extractAgentGraph(messages), [messages]);

  const handleGraphSelect = useCallback((item: IntentGraphSelection | null) => {
    setGraphSelection(item);
    if (item && item.kind === "root") {
      setOutputOpen(true);
    }
  }, []);

  const handleReset = useCallback(async () => {
    try {
      await fetch("/api/swarm/stop", { method: "POST" });
    } catch {
      // best-effort
    }
    reset();
    setGraphSelection(null);
    setOutputOpen(false);
  }, [reset]);

  const toggleLog = useCallback(() => setLogOpen((o) => !o), []);

  const selectedAgent = graphSelection?.kind === "agent" ? graphSelection.agent : null;

  const statusColor =
    status === "connected" ? "bg-status-connected" :
    status === "reconnecting" ? "bg-status-reconnecting" :
    "bg-status-disconnected";

  return (
    <div className="relative flex-1 flex flex-col h-[calc(100vh-7rem)]">
      {/* Status HUD */}
      <div className="absolute top-14 left-4 z-20 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        <span className="text-[10px] font-mono text-text-tertiary uppercase">
          {status}
        </span>
        {runStatus && (
          <span className="text-[10px] font-mono text-text-secondary ml-2">
            {runStatus.status}
            {typeof runStatus.completedCount === "number" && typeof runStatus.subGoalCount === "number"
              ? ` · ${runStatus.completedCount}/${runStatus.subGoalCount}`
              : ""}
            {typeof runStatus.agentCount === "number" ? ` · ${runStatus.agentCount} agents` : ""}
          </span>
        )}
        {deliverableContent && !outputOpen && (
          <button
            type="button"
            onClick={() => setOutputOpen(true)}
            className="text-[10px] font-medium text-accent-primary hover:underline ml-2"
          >
            View deliverable
          </button>
        )}
      </div>

      {/* 3D graph */}
      <div className="flex-1 relative">
        <IntentTree
          tree={tree}
          messages={messages}
          onGraphSelect={handleGraphSelect}
        />

        {selectedAgent && graph && (
          <AgentDossier
            agent={selectedAgent}
            allAgents={graph.agents}
            onClose={() => setGraphSelection(null)}
          />
        )}
      </div>

      {/* Input dock */}
      <div className="relative z-20 shrink-0">
        <IntentInput onSubmit={postIntent} disabled={status === "disconnected"} />
      </div>

      {/* Activity toasts */}
      <AgentToastStack messages={messages} />

      {/* Right-side nav strip */}
      <NavStrip
        onToggleLog={toggleLog}
        logOpen={logOpen}
        onReset={handleReset}
        messageCount={messages.length}
        hidden={outputOpen || logOpen}
      />

      {/* Protocol log drawer */}
      <MessageLogDrawer open={logOpen} onClose={() => setLogOpen(false)} messages={messages} />

      {/* Output pane */}
      <OutputPane
        open={outputOpen}
        onClose={() => setOutputOpen(false)}
        content={deliverableContent}
        stats={deliverableStats}
      />
    </div>
  );
}
