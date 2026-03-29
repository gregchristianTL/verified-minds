/**
 * IntentTree -- Three.js agent-centric graph (swarm) or legacy intent tree.
 *
 * When a swarm manifest exists, shows agents as the primary nodes in a ring
 * layout; otherwise falls back to the fractal intent tree layout.
 * Adapted for world-hack's dark volcanic theme.
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

import {
  agentNodeId,
  extractAgentGraph,
  layoutAgentGraphPositions,
  ROOT_NODE_ID,
  type AgentGraphModel,
  type GraphSelection,
} from "@/lib/swarm/agentGraph";
import type { StoredMessage, TreeNode } from "@/lib/swarm/types";

import {
  AGENT_STATE_RING,
  deriveNodeStates,
  filterTreeForViz,
  layoutNodes,
  ROOT_ACCENT,
  STATE_RING_COLORS,
  type SceneRuntime,
} from "./IntentTree.scene";
import { syncAgentScene, syncTreeScene } from "./IntentTree.sync";

/** Selection from the graph (agent / task / root) or legacy tree node. */
export type IntentGraphSelection = GraphSelection | { kind: "legacy"; node: TreeNode };

/**
 * Props for the IntentTree component.
 */
export interface IntentTreeProps {
  tree: TreeNode[];
  messages?: StoredMessage[];
  onGraphSelect?: (item: IntentGraphSelection | null) => void;
}

/** Create the Three.js scene, camera, renderer, event handlers, and animation loop. Returns a cleanup function. */
function initScene(
  container: HTMLDivElement,
  sceneRef: React.MutableRefObject<SceneRuntime | null>,
  onSelectRef: React.MutableRefObject<IntentTreeProps["onGraphSelect"]>,
): () => void {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.012);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(0, 6, 16);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0a0a, 0);
  container.appendChild(renderer.domElement);

  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(container.clientWidth, container.clientHeight);
  css2dRenderer.domElement.style.position = "absolute";
  css2dRenderer.domElement.style.top = "0";
  css2dRenderer.domElement.style.left = "0";
  css2dRenderer.domElement.style.pointerEvents = "none";
  container.appendChild(css2dRenderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const directional = new THREE.DirectionalLight(0xffffff, 0.4);
  directional.position.set(10, 20, 10);
  scene.add(directional);
  const fill = new THREE.DirectionalLight(0xf59e0b, 0.15);
  fill.position.set(-10, -5, -10);
  scene.add(fill);

  const gridHelper = new THREE.GridHelper(40, 40, 0x1a1a1a, 0x111111);
  gridHelper.position.y = -5;
  scene.add(gridHelper);

  const state: SceneRuntime = {
    scene, camera, renderer, css2dRenderer,
    nodeMeshes: new Map(), edgeLines: new Map(),
    raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(),
    animationId: 0, isDragging: false, isDown: false,
    prevMouse: { x: 0, y: 0 }, cameraAngle: 0,
    cameraRadius: 16, targetCameraRadius: 0, cameraHeight: 6,
    targetLookAt: new THREE.Vector3(0, 0, 0),
  };
  sceneRef.current = state;

  const onPointerDown = (e: PointerEvent): void => { state.isDown = true; state.isDragging = false; state.prevMouse = { x: e.clientX, y: e.clientY }; };

  const onPointerMove = (e: PointerEvent): void => {
    if (!state.isDown) return;
    const dx = e.clientX - state.prevMouse.x;
    const dy = e.clientY - state.prevMouse.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.isDragging = true;
    state.cameraAngle += dx * 0.005;
    state.cameraHeight = Math.max(-5, Math.min(20, state.cameraHeight - dy * 0.05));
    state.prevMouse = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (!state.isDragging) {
      const rect = renderer.domElement.getBoundingClientRect();
      state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.mouse, camera);
      const meshes = Array.from(state.nodeMeshes.values()).map((n) => n.mesh);
      const hits = state.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const hitMesh = hits[0].object;
        const found = Array.from(state.nodeMeshes.values()).find((n) => n.mesh === hitMesh);
        onSelectRef.current?.(found?.selection ?? null);
      } else {
        onSelectRef.current?.(null);
      }
    }
    state.isDown = false;
    state.isDragging = false;
  };

  const onWheel = (e: WheelEvent): void => { e.preventDefault(); state.cameraRadius = Math.max(5, Math.min(40, state.cameraRadius + e.deltaY * 0.02)); };

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

  const onResize = (): void => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    css2dRenderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener("resize", onResize);

  let time = 0;
  const animate = (): void => {
    state.animationId = requestAnimationFrame(animate);
    time += 0.008;
    if (!state.isDown) state.cameraAngle += 0.001;
    if (state.targetCameraRadius > 0) state.cameraRadius += (state.targetCameraRadius - state.cameraRadius) * 0.03;

    camera.position.x = Math.cos(state.cameraAngle) * state.cameraRadius;
    camera.position.z = Math.sin(state.cameraAngle) * state.cameraRadius;
    camera.position.y = state.cameraHeight;
    camera.lookAt(state.targetLookAt);

    for (const entry of state.nodeMeshes.values()) {
      const t = time + entry.mesh.position.x * 0.1;
      entry.mesh.position.y = entry.targetPos.y + Math.sin(t * 1.5) * 0.12;
      entry.mesh.position.x += (entry.targetPos.x - entry.mesh.position.x) * 0.05;
      entry.mesh.position.z += (entry.targetPos.z - entry.mesh.position.z) * 0.05;
      entry.glow.position.copy(entry.mesh.position);
      entry.glow.scale.setScalar(1.65 + Math.sin(t * 2) * 0.12);
      entry.ring.position.copy(entry.mesh.position);
      entry.ring.rotation.x = Math.PI / 2;
      entry.ring.rotation.z += 0.005;
      const ringMat = entry.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = entry.ringPulse ? Math.min(0.92, entry.ringOpacityBase + Math.sin(time * 2.8) * 0.2) : entry.ringOpacityBase;
    }

    for (const edge of state.edgeLines.values()) {
      const from = state.nodeMeshes.get(edge.fromId);
      const to = state.nodeMeshes.get(edge.toId);
      if (!from || !to) continue;
      const pos = edge.line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, from.mesh.position.x, from.mesh.position.y, from.mesh.position.z);
      pos.setXYZ(1, to.mesh.position.x, to.mesh.position.y, to.mesh.position.z);
      pos.needsUpdate = true;
    }

    renderer.render(scene, camera);
    css2dRenderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(state.animationId);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("wheel", onWheel);
    window.removeEventListener("resize", onResize);
    for (const n of state.nodeMeshes.values()) {
      n.mesh.remove(n.label); n.mesh.geometry.dispose(); (n.mesh.material as THREE.Material).dispose();
      n.glow.geometry.dispose(); (n.glow.material as THREE.Material).dispose();
      n.ring.geometry.dispose(); (n.ring.material as THREE.Material).dispose();
    }
    for (const e of state.edgeLines.values()) { e.line.geometry.dispose(); (e.line.material as THREE.Material).dispose(); }
    renderer.dispose();
    if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    if (container.contains(css2dRenderer.domElement)) container.removeChild(css2dRenderer.domElement);
    sceneRef.current = null;
  };
}

/**
 * IntentTree -- 3D visualization of swarm agent activity.
 *
 * @example
 * ```tsx
 * <IntentTree tree={tree} messages={messages} onGraphSelect={setSelection} />
 * ```
 */
export function IntentTree({ tree, messages = [], onGraphSelect }: IntentTreeProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneRuntime | null>(null);
  const onSelectRef = useRef(onGraphSelect);
  onSelectRef.current = onGraphSelect;

  const lastGraphRef = useRef<AgentGraphModel | null>(null);

  const vizState = useMemo(() => {
    const graph = extractAgentGraph(messages);

    if (graph) {
      if (lastGraphRef.current) {
        const currentIds = new Set(graph.agents.map((a) => a.id));
        for (const prev of lastGraphRef.current.agents) {
          if (!currentIds.has(prev.id)) graph.agents.push(prev);
        }
      }
      lastGraphRef.current = graph;
    }

    if (messages.length === 0) lastGraphRef.current = null;

    const effective = graph ?? lastGraphRef.current;

    if (effective) {
      const { positions, edges } = layoutAgentGraphPositions(effective);
      return { mode: "agent" as const, graph: effective, positions, edges };
    }

    const emptyTree = { mode: "tree" as const, flatNodes: [] as ReturnType<typeof layoutNodes> };
    const swarmIsActive = messages.some((m) => m.senderId === "swarm-orchestrator" || m.type === "PROMISE");
    if (swarmIsActive || lastGraphRef.current) return emptyTree;
    if (tree.length === 0) return emptyTree;
    const vizTree = filterTreeForViz(tree, messages);
    if (vizTree.length === 0) return emptyTree;
    return { mode: "tree" as const, flatNodes: layoutNodes(vizTree, null, 0, 0, vizTree.length) };
  }, [tree, messages]);

  const rootContent = vizState.mode === "agent" ? vizState.graph.rootContent : null;

  useEffect(() => {
    if (!containerRef.current) return;
    return initScene(containerRef.current, sceneRef, onSelectRef);
  }, []);

  // ── Sync graph nodes when vizState changes ──────────────────────────────────
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;

    const existingIds = new Set(state.nodeMeshes.keys());
    const nextIds = new Set<string>();

    if (vizState.mode === "agent") {
      nextIds.add(ROOT_NODE_ID);
      for (const a of vizState.graph.agents) nextIds.add(agentNodeId(a.id));
    } else {
      for (const { node } of vizState.flatNodes) nextIds.add(node.id);
    }

    const isReset = messages.length === 0;
    for (const id of existingIds) {
      if (nextIds.has(id)) continue;
      if (!isReset && (id === ROOT_NODE_ID || id.startsWith("agent:"))) continue;

      const nm = state.nodeMeshes.get(id)!;
      nm.mesh.remove(nm.label);
      state.scene.remove(nm.mesh);
      state.scene.remove(nm.glow);
      state.scene.remove(nm.ring);
      nm.mesh.geometry.dispose();
      (nm.mesh.material as THREE.Material).dispose();
      nm.glow.geometry.dispose();
      (nm.glow.material as THREE.Material).dispose();
      nm.ring.geometry.dispose();
      (nm.ring.material as THREE.Material).dispose();
      state.nodeMeshes.delete(id);
    }

    for (const [id, edge] of state.edgeLines) {
      state.scene.remove(edge.line);
      edge.line.geometry.dispose();
      (edge.line.material as THREE.Material).dispose();
      state.edgeLines.delete(id);
    }

    if (vizState.mode === "agent") {
      syncAgentScene(state, vizState.graph, vizState.positions, vizState.edges, sceneRef, onSelectRef);
      state.targetLookAt.lerp(new THREE.Vector3(0, 0, 0), 0.15);

      let maxDist = 0;
      for (const pos of vizState.positions.values()) {
        maxDist = Math.max(maxDist, Math.sqrt(pos.x * pos.x + pos.z * pos.z));
      }
      state.targetCameraRadius = maxDist + 8;
    } else {
      syncTreeScene(state, vizState.flatNodes, messages, sceneRef, onSelectRef);
      if (vizState.flatNodes.length > 0) {
        const center = new THREE.Vector3();
        for (const { pos } of vizState.flatNodes) center.add(pos);
        center.divideScalar(vizState.flatNodes.length);
        state.targetLookAt.lerp(center, 0.1);
      }
    }
  }, [vizState, messages]);

  // ── Sync ring colors as messages arrive ────────────────────────────────────
  useEffect(() => {
    const state = sceneRef.current;
    if (!state || messages.length === 0) return;

    const graph = extractAgentGraph(messages);
    if (graph) {
      for (const [id, entry] of state.nodeMeshes) {
        const mat = entry.ring.material as THREE.MeshBasicMaterial;
        if (id === ROOT_NODE_ID) {
          mat.color.setHex(ROOT_ACCENT);
          entry.ringOpacityBase = 0.45;
          entry.ringPulse = false;
          continue;
        }
        if (id.startsWith("agent:")) {
          const agentId = id.slice(7);
          const agent = graph.agents.find((a) => a.id === agentId);
          if (agent) {
            mat.color.setHex(AGENT_STATE_RING[agent.state]);
            entry.ringOpacityBase = agent.state === "idle" ? 0.28 : 0.62;
            entry.ringPulse = agent.state === "critiquing" || agent.state === "working";
          }
        }
      }
    } else {
      const nodeStates = deriveNodeStates(messages);
      for (const [nodeId, entry] of state.nodeMeshes) {
        if (nodeId.startsWith("agent:") || nodeId.startsWith("task:") || nodeId === ROOT_NODE_ID) continue;
        const nodeState = nodeStates.get(nodeId) ?? "unclaimed";
        const mat = entry.ring.material as THREE.MeshBasicMaterial;
        mat.color.setHex(STATE_RING_COLORS[nodeState]);
        entry.ringOpacityBase = nodeState === "unclaimed" ? 0.3 : 0.7;
        entry.ringPulse = false;
      }
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="relative w-full h-full three-canvas">
      <AnimatePresence>
        {rootContent && <RootIntentBadge content={rootContent} />}
      </AnimatePresence>

      {tree.length === 0 && !rootContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="text-center">
            <p className="text-sm text-text-secondary font-medium">No intents yet</p>
            <p className="text-xs text-text-tertiary mt-1">
              Declare an intent below to watch the swarm work
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root intent badge ────────────────────────────────────────────────────────

interface RootIntentBadgeProps {
  content: string;
}

function RootIntentBadge({ content }: RootIntentBadgeProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full px-8"
    >
      <div className="mx-auto max-w-2xl px-4 py-2 rounded-2xl bg-surface-elevated/80 backdrop-blur-sm border border-border-default shadow-sm text-center">
        <p className="text-xs font-medium text-accent-primary leading-snug">{content}</p>
      </div>
    </motion.div>
  );
}
