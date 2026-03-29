/**
 * Three.js scene types, constants, and helpers for IntentTree.
 *
 * Pure scene manipulation — no React. Exported and consumed by IntentTree.tsx
 * and IntentTree.sync.ts.
 */

import type { MutableRefObject } from "react";
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import {
  agentNodeId,
  type AgentViz,
  type AgentVizState,
  ROOT_NODE_ID,
} from "@/lib/swarm/agentGraph";
import type { StoredMessage, TreeNode } from "@/lib/swarm/types";

import type { IntentGraphSelection, IntentTreeProps } from "./IntentTree";

// ─── Types ───────────────────────────────────────────────────────────────────

/** State of a legacy tree node derived from message history. */
export type NodeState = "unclaimed" | "promised" | "complete";

/** Entry tracking a Three.js sphere + glow + ring for one graph node. */
export interface GraphMeshEntry {
  id: string;
  mesh: THREE.Mesh;
  label: CSS2DObject;
  labelElement: HTMLDivElement;
  labelText: string;
  targetPos: THREE.Vector3;
  glow: THREE.Mesh;
  ring: THREE.Mesh;
  selection: IntentGraphSelection;
  hoverEmissiveHex: number;
  ringPulse?: boolean;
  ringOpacityBase: number;
}

/** Edge line entry in the scene. */
export interface EdgeLine {
  id: string;
  line: THREE.Line;
  fromId: string;
  toId: string;
  kind: "root-agent" | "agent-subagent";
}

/** Mutable runtime state shared across the Three.js animation loop. */
export interface SceneRuntime {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  css2dRenderer: CSS2DRenderer;
  nodeMeshes: Map<string, GraphMeshEntry>;
  edgeLines: Map<string, EdgeLine>;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  animationId: number;
  isDragging: boolean;
  isDown: boolean;
  prevMouse: { x: number; y: number };
  cameraAngle: number;
  cameraRadius: number;
  targetCameraRadius: number;
  cameraHeight: number;
  targetLookAt: THREE.Vector3;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const LABEL_Y_ROOT = 0.62;
export const LABEL_Y_AGENT = 1.22;

export const RADIUS_ROOT = 0.38;
export const RADIUS_AGENT = 0.72;
export const RADIUS_SUBAGENT = 0.46;
export const RADIUS_SUBAGENT_DEEP = 0.34;

export const AGENT_PALETTE: number[] = [
  0x6366f1, 0x8b5cf6, 0xec4899, 0x14b8a6, 0xf59e0b, 0x10b981, 0xef4444, 0x3b82f6,
];

export const AGENT_STATE_RING: Record<AgentVizState, number> = {
  idle: 0xd1d5db,
  working: 0x10b981,
  completed: 0xf59e0b,
  declined: 0xef4444,
  critiquing: 0x8b5cf6,
};

export const STATE_RING_COLORS: Record<NodeState, number> = {
  unclaimed: 0xd1d5db,
  promised: 0x10b981,
  complete: 0xf59e0b,
};

export const TYPE_COLORS: Record<string, number> = {
  INTENT: 0x8b5cf6,
  PROMISE: 0x10b981,
  COMPLETE: 0xf59e0b,
  ASSESS: 0xeab308,
  DECLINE: 0xef4444,
};

export const DEFAULT_COLOR = 0x94a3b8;
export const ROOT_ACCENT = 0x8b5cf6;

// ─── Label / text helpers ─────────────────────────────────────────────────────

export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

function sanitizeHudLabel(input: string): string {
  return input.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function shortenErrorLikeLabel(s: string): string {
  const lower = s.toLowerCase();
  if (
    lower.includes("minified react") || lower.includes("react error") ||
    lower.includes("hydration") || lower.includes("error:") ||
    lower.includes("typeerror") || lower.includes("referenceerror")
  ) return "Error (see Protocol log)";
  return s;
}

/** Short display label for a legacy tree node. */
export function displayLabelForNode(node: TreeNode, messages: StoredMessage[]): string {
  const m = messages.find((x) => x.type === "INTENT" && x.intentId === node.id);
  const p = m?.payload as Record<string, unknown> | undefined;
  if (p?.isManifest) return "Swarm plan";
  if (p?.isPhaseMarker && typeof p.phase === "string") {
    const ph = p.phase as string;
    return ph.length > 14 ? `Phase: ${ph.slice(0, 11)}…` : `Phase: ${ph}`;
  }
  if (p?.isSynthesis || p?.isSummary) return "Final deliverable";
  if (p?.isCritique) return "Critique";
  if (node.type === "COMPLETE" || node.type === "PROMISE") {
    const raw = shortenErrorLikeLabel(sanitizeHudLabel(String(node.content || "")));
    if (raw.length <= 22) return raw || (node.type === "COMPLETE" ? "Complete" : "Promised");
    return `${raw.slice(0, 20)}…`;
  }
  const raw = shortenErrorLikeLabel(sanitizeHudLabel(String(node.content || node.type)));
  const cap = 28;
  return raw.length > cap ? `${raw.slice(0, cap - 1)}…` : raw;
}

/** Graph label for an agent, including task progress badge. */
export function agentLabelText(agent: AgentViz): string {
  const completed = agent.tasks.filter((t) => t.state === "complete").length;
  const total = agent.tasks.length;
  const progress = total > 0 ? ` · ${completed}/${total}` : "";
  const nameLine = `${agent.name}${progress}`;
  const nameCap = 32;
  const cappedName = nameLine.length > nameCap ? `${nameLine.slice(0, nameCap - 1)}…` : nameLine;

  const statusLine =
    agent.state === "working"
      ? agent.expertise.slice(0, 28) + (agent.expertise.length > 28 ? "…" : "")
      : agent.state === "critiquing"
        ? "Peer review"
        : agent.state === "completed"
          ? "Done"
          : agent.state === "declined"
            ? "Declined"
            : agent.expertise.slice(0, 28) + (agent.expertise.length > 28 ? "…" : "");
  return `${cappedName}\n${statusLine}`;
}

/** Truncated label for the root intent node. */
export function rootLabelText(content: string): string {
  const raw = sanitizeHudLabel(content);
  return raw.length > 36 ? `${raw.slice(0, 34)}…` : raw;
}

// ─── Message state helpers ────────────────────────────────────────────────────

/** Derive unclaimed/promised/complete state per intent from messages. */
export function deriveNodeStates(messages: StoredMessage[]): Map<string, NodeState> {
  const states = new Map<string, NodeState>();
  for (const m of messages) {
    if (m.type === "INTENT" && m.intentId) {
      if (!states.has(m.intentId)) states.set(m.intentId, "unclaimed");
    }
    if (m.type === "PROMISE" && m.intentId) states.set(m.intentId, "promised");
    if (m.type === "COMPLETE" && m.intentId) states.set(m.intentId, "complete");
  }
  return states;
}

// ─── Tree layout ──────────────────────────────────────────────────────────────

/** Recursively compute 3D positions for a legacy tree. */
export function layoutNodes(
  nodes: TreeNode[],
  parentPos: THREE.Vector3 | null,
  depth: number,
  siblingIndex: number,
  siblingCount: number,
): Array<{ node: TreeNode; pos: THREE.Vector3; parentPos: THREE.Vector3 | null }> {
  const result: Array<{ node: TreeNode; pos: THREE.Vector3; parentPos: THREE.Vector3 | null }> = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const angle =
      siblingCount > 1 ? (i / siblingCount) * Math.PI * 2 + depth * 0.7 : siblingIndex * Math.PI * 0.5;
    const radius = depth === 0 ? 4.0 + siblingCount * 0.75 : 3.0 + siblingCount * 0.55;
    const x = parentPos ? parentPos.x + Math.cos(angle) * radius : 0;
    const y = parentPos ? parentPos.y - depth * 1.2 : 0;
    const z = parentPos ? parentPos.z + Math.sin(angle) * radius : 0;

    const pos = new THREE.Vector3(x, y, z);
    result.push({ node, pos, parentPos });
    if (node.children.length > 0) {
      result.push(...layoutNodes(node.children, pos, depth + 1, i, node.children.length));
    }
  }
  return result;
}

/** Return true if this intent should be hidden from the 3D viz. */
export function isHiddenIntentForViz(node: TreeNode, messages: StoredMessage[]): boolean {
  if (node.type === "PROMISE" || node.type === "COMPLETE" || node.type === "DECLINE") return true;
  if (node.type !== "INTENT") return false;
  const m = messages.find((x) => x.type === "INTENT" && x.intentId === node.id);
  if (!m) return false;
  const p = m.payload as Record<string, unknown>;
  if (p.isManifest || p.isPhaseMarker || p.isSynthesis || p.isSummary || p.isCritique || p.isRunRecord) return true;
  if (String(p.content ?? "").includes("declined:")) return true;
  return false;
}

/** Filter tree nodes for visualization, removing system-only intents. */
export function filterTreeForViz(nodes: TreeNode[], messages: StoredMessage[]): TreeNode[] {
  return nodes
    .filter((n) => !isHiddenIntentForViz(n, messages))
    .map((n) => ({ ...n, children: filterTreeForViz(n.children, messages) }));
}

// ─── CSS2D label ──────────────────────────────────────────────────────────────

/** Create a CSS2D label attached to a Three.js mesh. */
export function createCss2dLabel(
  text: string,
  accentHex: number,
  labelClass: "node-label" | "agent-label",
  labelY: number,
  selection: IntentGraphSelection,
  sceneRef: MutableRefObject<SceneRuntime | null>,
  onSelectRef: MutableRefObject<IntentTreeProps["onGraphSelect"] | undefined>,
): { object: CSS2DObject; element: HTMLDivElement } {
  const div = document.createElement("div");
  div.className = labelClass === "node-label" ? "node-label" : "node-label agent-label";
  div.textContent = text;
  div.title = text;
  div.style.setProperty("--node-label-accent", hexToCss(accentHex));

  div.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelectRef.current?.(selection);
  });

  div.addEventListener("mouseenter", () => {
    const st = sceneRef.current;
    const meshId =
      selection.kind === "legacy"
        ? selection.node.id
        : selection.kind === "root"
          ? ROOT_NODE_ID
          : agentNodeId(selection.agent.id);
    const entry = st?.nodeMeshes.get(meshId);
    if (!entry) return;
    const mat = entry.mesh.material as THREE.MeshPhongMaterial;
    mat.emissive.setHex(entry.hoverEmissiveHex).multiplyScalar(0.28);
  });

  div.addEventListener("mouseleave", () => {
    const st = sceneRef.current;
    const meshId =
      selection.kind === "legacy"
        ? selection.node.id
        : selection.kind === "root"
          ? ROOT_NODE_ID
          : agentNodeId(selection.agent.id);
    const entry = st?.nodeMeshes.get(meshId);
    if (!entry) return;
    const mat = entry.mesh.material as THREE.MeshPhongMaterial;
    mat.emissive.setHex(0x000000);
  });

  const object = new CSS2DObject(div);
  object.position.set(0, labelY, 0);
  object.center.set(0.5, 0);
  return { object, element: div };
}
