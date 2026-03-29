/**
 * Swarm Orchestrator -- recursive three-phase pipeline.
 *
 * Ported from adin-swarm/agents/swarm.ts. All TCP/socket code replaced with
 * messageStore DB operations. Runs inside a Next.js API route (/api/swarm/run).
 *
 * Pipeline: Decompose → Explore → Critique → Synthesize
 *
 * Agents can spawn sub-swarms: if a sub-goal is flagged `delegatable`,
 * the assigned agent runs a full nested pipeline (up to MAX_DEPTH levels).
 */

import OpenAI from "openai";

import { isStopSignaled, postMessage } from "./messageStore";
import {
  agentCritique,
  agentDecide,
  agentWork,
  decomposeAndPlan,
  synthesizeDeliverable,
} from "./pipelineSteps";
import type {
  AgentPersona,
  CompletedWork,
  CritiqueResult,
  PipelineResult,
  RunRecord,
  SwarmManifest,
} from "./pipelineSteps";
import { runDirectCompletion } from "./tools";

const SWARM_ID = "swarm-orchestrator";
const MAX_DEPTH = 5;

/** Configurable model; defaults to gpt-4o-mini */
const SWARM_CHAT_MODEL =
  process.env.OPENAI_SWARM_MODEL?.trim() || "gpt-4o-mini";

const openai = new OpenAI();

// ---- Helpers ----

function log(source: string, msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.warn(`[${ts}] [${source}] ${msg}`);
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Post an ITP message to the DB via messageStore. */
async function post(msg: {
  type: string;
  messageId?: string;
  parentId: string;
  senderId: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  await postMessage(msg);
}

async function sendPhaseMarker(
  parentIntentId: string,
  phase: "explore" | "critique" | "synthesize",
  label: string,
  depth: number,
): Promise<void> {
  await post({
    type: "INTENT",
    messageId: `phase-${phase}-${parentIntentId}-${randomId()}`,
    parentId: parentIntentId,
    senderId: SWARM_ID,
    payload: { content: label, phase, isPhaseMarker: true, depth },
  });
  log(SWARM_ID, label);
}

async function sendRunStatus(record: RunRecord): Promise<void> {
  await post({
    type: "INTENT",
    messageId: `run-${record.runId}-${record.status}`,
    parentId: record.intentId,
    senderId: SWARM_ID,
    payload: { content: `Run ${record.status}`, isRunRecord: true, run: record },
  });
}

// ---- Phase: Explore ----

interface SubIntentEntry {
  id: string;
  content: string;
  delegatable: boolean;
}

/** Broadcast sub-goals and have agents claim + complete them. */
async function runExplorePhase(
  intentId: string,
  content: string,
  agents: AgentPersona[],
  subIntents: Array<{ content: string; delegatable?: boolean }>,
  depth: number,
  startedAt: number,
): Promise<{ completedWork: CompletedWork[]; subIntentIds: SubIntentEntry[] }> {
  const depthLabel = depth > 0 ? ` [depth ${depth}]` : "";

  await sendPhaseMarker(
    intentId, "explore",
    `Phase: Explore${depthLabel} -- agents claim sub-goals and produce initial findings`,
    depth,
  );

  const subIntentIds: SubIntentEntry[] = [];
  for (const sub of subIntents) {
    const subId = `${intentId}-${randomId()}`;
    await post({
      type: "INTENT", messageId: subId, parentId: intentId, senderId: SWARM_ID,
      payload: { content: sub.content, phase: "explore", delegatable: Boolean(sub.delegatable), depth },
    });
    subIntentIds.push({ id: subId, content: sub.content, delegatable: Boolean(sub.delegatable) });
    log(SWARM_ID, `${depthLabel} Sub-intent${sub.delegatable ? " [delegatable]" : ""}: "${sub.content}"`);
    await sleep(300);
  }

  await sleep(800);

  const allContents = subIntentIds.map((s) => s.content);
  const completedWork: CompletedWork[] = [];

  for (const sub of subIntentIds) {
    if (await isStopSignaled(startedAt)) {
      log(SWARM_ID, "Pipeline aborted during explore phase.");
      break;
    }

    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    let handled = false;

    for (const agent of shuffled) {
      try {
        const decision = await agentDecide(openai, SWARM_CHAT_MODEL, agent, sub.content, allContents, completedWork);
        if (!decision) continue;

        if (decision.accept) {
          const promiseId = `promise-${agent.id}-${sub.id}`;
          await post({
            type: "PROMISE", messageId: promiseId, parentId: sub.id, senderId: agent.id,
            payload: { content: `${agent.name}: ${decision.reason}`, phase: "explore", depth },
          });
          log(agent.id, `Promised: "${sub.content}"`);
          await sleep(1500 + Math.random() * 3000);

          let result: string;
          if (sub.delegatable && depth < MAX_DEPTH) {
            log(agent.id, `Spawning sub-swarm (depth ${depth + 1}) for: "${sub.content}"`);
            const subResult = await runPipeline(sub.id, sub.content, depth + 1, startedAt);
            result = subResult.deliverable || `Sub-swarm explored ${subResult.completedWork.length} aspects of "${sub.content}".`;
          } else {
            result = await agentWork(openai, agent, sub.content, decision.approach, completedWork);
          }

          await post({
            type: "COMPLETE", messageId: promiseId, parentId: sub.id, senderId: agent.id,
            payload: { content: result, phase: "explore", depth },
          });
          log(agent.id, `Completed: ${result.slice(0, 120)}`);
          completedWork.push({ agentId: agent.id, agentName: agent.name, subIntent: sub.content, result });
          handled = true;
          break;
        } else {
          await post({
            type: "INTENT", messageId: `decline-${agent.id}-${sub.id}`, parentId: sub.id, senderId: agent.id,
            payload: { content: `${agent.name} declined: ${decision.reason}`, phase: "explore", depth },
          });
          log(agent.id, `Declined: "${sub.content}"`);
          await sleep(400);
        }
      } catch (err: unknown) {
        log(agent.id, `Decision error: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (!handled) log(SWARM_ID, `No agent took: "${sub.content}"`);
  }

  return { completedWork, subIntentIds };
}

// ---- Phase: Critique ----

/** Have each agent critique the next agent's work in round-robin order. */
async function runCritiquePhase(
  intentId: string,
  content: string,
  manifest: SwarmManifest,
  completedWork: CompletedWork[],
  depth: number,
): Promise<CritiqueResult[]> {
  const depthLabel = depth > 0 ? ` [depth ${depth}]` : "";

  await sendPhaseMarker(
    intentId, "critique",
    `Phase: Critique${depthLabel} -- peer review of explore outputs`,
    depth,
  );

  const critiques: CritiqueResult[] = [];

  if (completedWork.length < 2) {
    log(SWARM_ID, "Skipping peer critique (need at least two completed sub-goals)");
    return critiques;
  }

  const n = completedWork.length;
  for (let i = 0; i < n; i++) {
    const ownWork = completedWork[i];
    const target = completedWork[(i + 1) % n];
    const persona = manifest.agents.find((a) => a.id === ownWork.agentId);
    if (!persona) continue;

    try {
      const critiqueText = await agentCritique(openai, persona, ownWork, target, content);
      if (!critiqueText.trim()) continue;

      critiques.push({
        reviewerId: persona.id, reviewerName: persona.name,
        targetAgentName: target.agentName, targetSubIntent: target.subIntent,
        content: critiqueText,
      });

      await post({
        type: "INTENT",
        messageId: `critique-${persona.id}-${intentId}-${i}-${randomId()}`,
        parentId: intentId, senderId: persona.id,
        payload: {
          content: `${persona.name} critiques ${target.agentName}: ${critiqueText}`,
          phase: "critique", isCritique: true,
          reviewTarget: target.agentName, reviewSubIntent: target.subIntent, depth,
        },
      });
      log(persona.id, `Critique of ${target.agentName}: ${critiqueText.slice(0, 120)}...`);
      await sleep(350);
    } catch (err: unknown) {
      log(persona.id, `Critique error: ${err instanceof Error ? err.message : err}`);
    }
  }

  return critiques;
}

// ---- Core Pipeline ----

/**
 * Run the three-phase pipeline (explore -> critique -> synthesize).
 *
 * Can be called recursively for sub-swarms spawned by delegatable sub-goals.
 */
export async function runPipeline(
  intentId: string,
  content: string,
  depth: number,
  startedAt: number,
): Promise<PipelineResult> {
  if (depth > MAX_DEPTH) {
    log(SWARM_ID, `Max depth (${depth}), using direct completion`);
    const deliverable = await runDirectCompletion(openai, {
      system: "You are a specialist AI. Complete the following task thoroughly and concisely. Use markdown formatting.",
      user: `Task: "${content}"`,
      temperature: 0.65,
      max_completion_tokens: 1200,
    });
    return { deliverable, completedWork: [] };
  }

  const depthLabel = depth > 0 ? ` [depth ${depth}]` : "";
  const runId = `${intentId}-${randomId()}`;
  const runRecord: RunRecord = { runId, intentId, status: "started", depth, startedAt };
  await sendRunStatus(runRecord);
  log(SWARM_ID, `Designing swarm${depthLabel} for "${content}"`);

  let plan: Awaited<ReturnType<typeof decomposeAndPlan>>;
  try {
    plan = await decomposeAndPlan(openai, SWARM_CHAT_MODEL, content, depth);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(SWARM_ID, `Decomposition failed: ${msg}`);
    await sendRunStatus({ ...runRecord, status: "failed", finishedAt: Date.now(), elapsedMs: Date.now() - startedAt, error: msg });
    return { deliverable: "", completedWork: [] };
  }

  await post({
    type: "INTENT", messageId: `manifest-${intentId}`, parentId: intentId, senderId: SWARM_ID,
    payload: { content: `Swarm manifest: ${plan.manifest.strategy}`, manifest: plan.manifest, isManifest: true, depth },
  });
  log(SWARM_ID, `${depthLabel} Spawned ${plan.manifest.agents.length} agents: ${plan.manifest.agents.map((a) => a.name).join(", ")}`);
  await sleep(500);

  if (await isStopSignaled(startedAt)) {
    log(SWARM_ID, "Pipeline aborted before explore phase.");
    await sendRunStatus({ ...runRecord, status: "aborted", agentCount: plan.manifest.agents.length, finishedAt: Date.now(), elapsedMs: Date.now() - startedAt });
    return { deliverable: "", completedWork: [] };
  }

  runRecord.agentCount = plan.manifest.agents.length;
  runRecord.subGoalCount = plan.subIntents.length;
  await sendRunStatus({ ...runRecord, status: "exploring" });

  const { completedWork, subIntentIds } = await runExplorePhase(
    intentId, content, [...plan.manifest.agents], plan.subIntents, depth, startedAt,
  );

  if (await isStopSignaled(startedAt)) {
    log(SWARM_ID, "Pipeline aborted before critique phase.");
    await sendRunStatus({ ...runRecord, status: "aborted", completedCount: completedWork.length, finishedAt: Date.now(), elapsedMs: Date.now() - startedAt });
    return { deliverable: "", completedWork };
  }

  await sendRunStatus({ ...runRecord, status: "critiquing", completedCount: completedWork.length });
  const critiques = await runCritiquePhase(intentId, content, plan.manifest, completedWork, depth);

  if (await isStopSignaled(startedAt)) {
    log(SWARM_ID, "Pipeline aborted before synthesis phase.");
    await sendRunStatus({ ...runRecord, status: "aborted", completedCount: completedWork.length, critiqueCount: critiques.length, finishedAt: Date.now(), elapsedMs: Date.now() - startedAt });
    return { deliverable: "", completedWork };
  }

  await sendRunStatus({ ...runRecord, status: "synthesizing", completedCount: completedWork.length, critiqueCount: critiques.length });
  await sendPhaseMarker(intentId, "synthesize", `Phase: Synthesize${depthLabel} -- merging work and critiques into deliverable`, depth);

  let deliverable: string;
  try {
    deliverable = await synthesizeDeliverable(openai, content, completedWork, critiques, plan.manifest, depth);
  } catch {
    deliverable = `Swarm finished with ${completedWork.length}/${subIntentIds.length} sub-goals by ${plan.manifest.agents.length} agents.`;
  }

  if (depth === 0) {
    await post({
      type: "INTENT", messageId: `synthesis-${intentId}`, parentId: intentId, senderId: SWARM_ID,
      payload: {
        content: deliverable, phase: "synthesize", isSynthesis: true, isSummary: true,
        stats: { total: subIntentIds.length, completed: completedWork.length, agents: plan.manifest.agents.length, critiques: critiques.length, elapsedMs: Date.now() - startedAt },
      },
    });
    log(SWARM_ID, "Final deliverable posted.");
  }

  await sendRunStatus({ ...runRecord, status: "completed", completedCount: completedWork.length, critiqueCount: critiques.length, finishedAt: Date.now(), elapsedMs: Date.now() - startedAt });
  return { deliverable, completedWork };
}
