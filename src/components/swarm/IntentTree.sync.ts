/**
 * Three.js scene sync functions for IntentTree.
 *
 * Separated from IntentTree.scene.ts to respect the 600-line file limit.
 * Contains addGraphEntry, syncAgentScene, and syncTreeScene.
 */

import type { MutableRefObject } from "react";
import * as THREE from "three";

import {
  agentNodeId,
  type AgentGraphModel,
  type LayoutEdge,
  ROOT_NODE_ID,
} from "@/lib/swarm/agentGraph";
import type { StoredMessage, TreeNode } from "@/lib/swarm/types";

import type { IntentGraphSelection, IntentTreeProps } from "./IntentTree";
import {
  AGENT_PALETTE,
  AGENT_STATE_RING,
  agentLabelText,
  createCss2dLabel,
  DEFAULT_COLOR,
  displayLabelForNode,
  hexToCss,
  RADIUS_AGENT,
  RADIUS_ROOT,
  RADIUS_SUBAGENT,
  RADIUS_SUBAGENT_DEEP,
  ROOT_ACCENT,
  rootLabelText,
  STATE_RING_COLORS,
  TYPE_COLORS,
  type GraphMeshEntry,
  type SceneRuntime,
} from "./IntentTree.scene";

// ─── Scene sync ───────────────────────────────────────────────────────────────

/** Add or update one graph node (sphere + glow + ring + label) in the scene. */
export function addGraphEntry(
  state: SceneRuntime,
  opts: {
    id: string;
    pos: THREE.Vector3;
    radius: number;
    torusRadius: number;
    color: number;
    opacity: number;
    labelText: string;
    labelClass: "node-label" | "agent-label";
    labelY: number;
    selection: IntentGraphSelection;
    ringColor: number;
    ringOpacity: number;
    ringPulse?: boolean;
    sceneRef: MutableRefObject<SceneRuntime | null>;
    onSelectRef: MutableRefObject<IntentTreeProps["onGraphSelect"] | undefined>;
  },
): void {
  const {
    id, pos, radius, torusRadius, color, opacity,
    labelText, labelClass, labelY, selection,
    ringColor, ringOpacity, ringPulse = false,
    sceneRef, onSelectRef,
  } = opts;

  const geometry = new THREE.SphereGeometry(radius, 28, 28);
  const material = new THREE.MeshPhongMaterial({ color, shininess: 75, transparent: true, opacity });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(pos);
  mesh.userData.selection = selection;

  const glowGeo = new THREE.SphereGeometry(radius, 14, 14);
  const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.copy(pos);
  glow.scale.setScalar(1.35);

  const ringGeo = new THREE.TorusGeometry(torusRadius, 0.035, 8, 28);
  const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: ringOpacity });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.rotation.x = Math.PI / 2;

  const { object: label, element: labelElement } = createCss2dLabel(
    labelText, color, labelClass, labelY, selection, sceneRef, onSelectRef,
  );
  mesh.add(label);

  state.scene.add(mesh);
  state.scene.add(glow);
  state.scene.add(ring);

  state.nodeMeshes.set(id, {
    id, mesh, label, labelElement, labelText,
    targetPos: pos.clone(), glow, ring, selection,
    hoverEmissiveHex: color, ringPulse, ringOpacityBase: ringOpacity,
  });
}

/** Sync the agent-centric graph scene (root + agent spheres + edges). */
export function syncAgentScene(
  state: SceneRuntime,
  graph: AgentGraphModel,
  positions: Map<string, THREE.Vector3>,
  edges: LayoutEdge[],
  sceneRef: MutableRefObject<SceneRuntime | null>,
  onSelectRef: MutableRefObject<IntentTreeProps["onGraphSelect"] | undefined>,
): void {
  const rootPos = positions.get(ROOT_NODE_ID) ?? new THREE.Vector3(0, 0, 0);
  const rootSel: IntentGraphSelection = {
    kind: "root",
    intentId: graph.rootIntentId,
    content: graph.rootContent,
  };

  if (!state.nodeMeshes.has(ROOT_NODE_ID)) {
    addGraphEntry(state, {
      id: ROOT_NODE_ID, pos: rootPos, radius: RADIUS_ROOT, torusRadius: 0.52,
      color: ROOT_ACCENT, opacity: 0.92,
      labelText: rootLabelText(graph.rootContent), labelClass: "node-label",
      labelY: 0.62, selection: rootSel,
      ringColor: ROOT_ACCENT, ringOpacity: 0.45, ringPulse: false,
      sceneRef, onSelectRef,
    });
  } else {
    const e = state.nodeMeshes.get(ROOT_NODE_ID)!;
    e.targetPos.copy(rootPos);
    e.selection = rootSel;
    e.ringOpacityBase = 0.45;
    e.ringPulse = false;
    const lt = rootLabelText(graph.rootContent);
    if (e.labelText !== lt) {
      e.labelElement.textContent = lt;
      e.labelElement.title = lt;
      e.labelText = lt;
    }
  }

  graph.agents.forEach((agent, idx) => {
    const id = agentNodeId(agent.id);
    const pos = positions.get(id);
    if (!pos) return;
    const color = AGENT_PALETTE[idx % AGENT_PALETTE.length];
    const dimmed = agent.state === "declined";
    const sel: IntentGraphSelection = { kind: "agent", agent };
    const label = agentLabelText(agent);
    const radius = agent.depth === 0 ? RADIUS_AGENT : agent.depth === 1 ? RADIUS_SUBAGENT : RADIUS_SUBAGENT_DEEP;
    const torusRadius = radius * 1.35;
    const labelY = radius + 0.4;
    const baseOpacity = agent.depth === 0 ? 0.92 : agent.depth === 1 ? 0.82 : 0.72;

    if (!state.nodeMeshes.has(id)) {
      addGraphEntry(state, {
        id, pos, radius, torusRadius, color,
        opacity: dimmed ? 0.38 : baseOpacity,
        labelText: label, labelClass: "agent-label", labelY, selection: sel,
        ringColor: AGENT_STATE_RING[agent.state],
        ringOpacity: agent.state === "idle" ? 0.22 : 0.55,
        ringPulse: agent.state === "critiquing" || agent.state === "working",
        sceneRef, onSelectRef,
      });
    } else {
      const e = state.nodeMeshes.get(id)!;
      e.targetPos.copy(pos);
      e.selection = sel;
      e.ringOpacityBase = agent.state === "idle" ? 0.22 : 0.55;
      e.ringPulse = agent.state === "critiquing" || agent.state === "working";
      if (e.labelText !== label) {
        e.labelElement.textContent = label;
        e.labelElement.title = label;
        e.labelText = label;
      }
      e.labelElement.style.setProperty("--node-label-accent", hexToCss(color));
      const mat = e.mesh.material as THREE.MeshPhongMaterial;
      mat.color.setHex(color);
      mat.opacity = dimmed ? 0.38 : baseOpacity;
      e.hoverEmissiveHex = color;
      const ringMat = e.ring.material as THREE.MeshBasicMaterial;
      ringMat.color.setHex(AGENT_STATE_RING[agent.state]);
    }
  });

  const seenEdge = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.fromId}->${edge.toId}`;
    if (seenEdge.has(key)) continue;
    seenEdge.add(key);
    const a = positions.get(edge.fromId);
    const b = positions.get(edge.toId);
    if (!a || !b) continue;

    const edgeColor = edge.kind === "agent-subagent" ? 0xf59e0b : 0xc4b5fd;
    const edgeOpacity = edge.kind === "agent-subagent" ? 0.55 : 0.45;

    const pts = new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pts, 3));

    const mat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity });
    const line = new THREE.Line(geom, mat);
    state.scene.add(line);
    state.edgeLines.set(key, { id: key, line, fromId: edge.fromId, toId: edge.toId, kind: edge.kind });
  }
}

/** Sync the legacy fractal tree scene (nodes + edges). */
export function syncTreeScene(
  state: SceneRuntime,
  flatNodes: Array<{ node: TreeNode; pos: THREE.Vector3; parentPos: THREE.Vector3 | null }>,
  messages: StoredMessage[],
  sceneRef: MutableRefObject<SceneRuntime | null>,
  onSelectRef: MutableRefObject<IntentTreeProps["onGraphSelect"] | undefined>,
): void {
  for (const { node, pos } of flatNodes) {
    const labelStr = displayLabelForNode(node, messages);
    const accentHex = TYPE_COLORS[node.type] ?? DEFAULT_COLOR;
    const selection: IntentGraphSelection = { kind: "legacy", node };

    if (state.nodeMeshes.has(node.id)) {
      const e = state.nodeMeshes.get(node.id)!;
      e.targetPos.copy(pos);
      e.selection = selection;
      if (e.labelText !== labelStr) {
        e.labelElement.textContent = labelStr;
        e.labelElement.title = labelStr;
        e.labelText = labelStr;
      }
      e.labelElement.style.setProperty("--node-label-accent", hexToCss(accentHex));
      continue;
    }

    addGraphEntry(state, {
      id: node.id, pos, radius: 0.5, torusRadius: 0.65,
      color: accentHex, opacity: 0.9,
      labelText: labelStr, labelClass: "node-label", labelY: 0.95, selection,
      ringColor: STATE_RING_COLORS.unclaimed, ringOpacity: 0.35,
      sceneRef, onSelectRef,
    });
  }

  for (const { node, parentPos } of flatNodes) {
    if (!parentPos) continue;
    const childMesh = state.nodeMeshes.get(node.id);
    if (!childMesh) continue;

    const tp = childMesh.targetPos;
    const pts = new Float32Array([parentPos.x, parentPos.y, parentPos.z, tp.x, tp.y, tp.z]);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xd1d5db, transparent: true, opacity: 0.4 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    state.scene.add(line);

    const edgeId = `${node.parentId}->${node.id}`;
    state.edgeLines.set(edgeId, { id: edgeId, line, fromId: node.parentId, toId: node.id, kind: "root-agent" });
  }
}
