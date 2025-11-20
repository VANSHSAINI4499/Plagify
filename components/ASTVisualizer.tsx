"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface HTMLElementEventMap {
    gesturestart: Event;
    gesturechange: Event;
    gestureend: Event;
  }
}

export type ASTNode = {
  type: string;
  value?: string;
  children?: ASTNode[];
};

interface ASTVisualizerProps {
  nodes: ASTNode[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

type PositionedNode = {
  id: number;
  type: string;
  value?: string;
  depth: number;
  x: number;
  y: number;
  parentId?: number;
};

type ViewState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 68;
const HORIZONTAL_GAP = 150;
const VERTICAL_GAP = 120;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.6;

export function ASTVisualizer({
  nodes,
  title = "AST visualization",
  subtitle,
  emptyMessage = "Awaiting analysis",
}: ASTVisualizerProps) {
  const hasNodes = nodes && nodes.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 480 });
  const viewRef = useRef<ViewState>({ scale: 1, offsetX: 0, offsetY: 60 });
  const hasInteractedRef = useRef(false);
  const dragging = useRef(false);
  const pointerOrigin = useRef({ x: 0, y: 0 });

  const positionedNodes = useMemo(() => layoutForest(nodes), [nodes]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    renderScene(ctx, positionedNodes, viewRef.current, dpr);
  }, [dimensions, positionedNodes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    hasInteractedRef.current = false;
  }, [nodes]);

  useEffect(() => {
    if (!positionedNodes.length) {
      redraw();
      return;
    }
    if (!hasInteractedRef.current) {
      viewRef.current = computeInitialView(positionedNodes, dimensions);
    }
    redraw();
  }, [positionedNodes, dimensions, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (event: Event) => event.preventDefault();
    const listenerOptions: AddEventListenerOptions = { passive: false };
    canvas.addEventListener("gesturestart", handler, listenerOptions);
    canvas.addEventListener("gesturechange", handler, listenerOptions);
    canvas.addEventListener("gestureend", handler, listenerOptions);
    return () => {
      canvas.removeEventListener("gesturestart", handler);
      canvas.removeEventListener("gesturechange", handler);
      canvas.removeEventListener("gestureend", handler);
    };
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const current = viewRef.current;
      const scaleDelta = event.deltaY < 0 ? 1.12 : 0.9;
      const nextScale = clamp(current.scale * scaleDelta, MIN_SCALE, MAX_SCALE);
      const worldX = (mouseX - current.offsetX) / current.scale;
      const worldY = (mouseY - current.offsetY) / current.scale;
      viewRef.current = {
        scale: nextScale,
        offsetX: mouseX - worldX * nextScale,
        offsetY: mouseY - worldY * nextScale,
      };
      hasInteractedRef.current = true;
      redraw();
    },
    [redraw],
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    dragging.current = true;
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    hasInteractedRef.current = true;
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragging.current) return;
      event.stopPropagation();
      const deltaX = event.clientX - pointerOrigin.current.x;
      const deltaY = event.clientY - pointerOrigin.current.y;
      pointerOrigin.current = { x: event.clientX, y: event.clientY };
      viewRef.current = {
        ...viewRef.current,
        offsetX: viewRef.current.offsetX + deltaX,
        offsetY: viewRef.current.offsetY + deltaY,
      };
      redraw();
    },
    [redraw],
  );

  const endPan = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const resetView = useCallback(() => {
    if (!positionedNodes.length) return;
    viewRef.current = computeInitialView(positionedNodes, dimensions);
    hasInteractedRef.current = false;
    redraw();
  }, [dimensions, positionedNodes, redraw]);

  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">{title}</p>
        {subtitle && <span className="text-xs text-white/40">{subtitle}</span>}
      </div>
      {hasNodes ? (
        <div
          ref={containerRef}
          className="relative h-112 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20"
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onWheelCapture={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPan}
            onPointerLeave={() => {
              dragging.current = false;
            }}
            style={{ touchAction: "none" }}
          />
          <div className="pointer-events-none absolute left-4 top-4 text-xs uppercase tracking-[0.3em] text-white/50">
            Scroll to zoom · drag to pan
          </div>
          <button
            type="button"
            onClick={resetView}
            className="pointer-events-auto absolute right-4 top-4 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs text-white/70 transition hover:text-white"
          >
            Reset view
          </button>
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-white/50">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

function layoutForest(nodes: ASTNode[]): PositionedNode[] {
  const positions: PositionedNode[] = [];
  let cursor = 0;

  const visit = (node: ASTNode, depth: number, parentId?: number): number => {
    const id = positions.length;
    positions.push({
      id,
      type: node.type,
      value: node.value,
      depth,
      x: 0,
      y: depth * VERTICAL_GAP,
      parentId,
    });

    const children = node.children ?? [];
    if (!children.length) {
      positions[id].x = cursor * HORIZONTAL_GAP;
      cursor += 1;
      return id;
    }

    const childIds = children.map((child) => visit(child, depth + 1, id));
    const averageX = childIds.reduce((sum, childId) => sum + positions[childId].x, 0) / childIds.length;
    positions[id].x = averageX;
    return id;
  };

  nodes.forEach((node) => visit(node, 0));

  if (!positions.length) return positions;
  const minX = Math.min(...positions.map((node) => node.x));
  positions.forEach((node) => {
    node.x -= minX;
  });
  return positions;
}

function computeInitialView(nodes: PositionedNode[], dimensions: { width: number; height: number }): ViewState {
  if (!nodes.length) {
    return { scale: 1, offsetX: dimensions.width / 2 - NODE_WIDTH / 2, offsetY: 60 };
  }

  const bounds = nodes.reduce(
    (acc, node) => {
      const left = node.x - NODE_WIDTH / 2;
      const right = node.x + NODE_WIDTH / 2;
      const bottom = node.y + NODE_HEIGHT;
      return {
        minX: Math.min(acc.minX, left),
        maxX: Math.max(acc.maxX, right),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, bottom),
      };
    },
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    },
  );

  const treeWidth = Math.max(1, bounds.maxX - bounds.minX);
  const treeHeight = Math.max(1, bounds.maxY - bounds.minY);
  const margin = 140;
  const scaleX = (dimensions.width - margin) / treeWidth;
  const scaleY = (dimensions.height - margin) / treeHeight;
  const baseScale = Math.min(scaleX, scaleY, 1.4);
  const scale = clamp(baseScale, MIN_SCALE, MAX_SCALE);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const offsetX = dimensions.width / 2 - centerX * scale;
  const offsetY = margin / 2 - bounds.minY * scale;
  return { scale, offsetX, offsetY };
}

function renderScene(
  ctx: CanvasRenderingContext2D,
  nodes: PositionedNode[],
  view: ViewState,
  devicePixelRatio: number,
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.scale(devicePixelRatio, devicePixelRatio);

  drawBackground(ctx, view);

  ctx.translate(view.offsetX, view.offsetY);
  ctx.scale(view.scale, view.scale);

  drawEdges(ctx, nodes, view.scale);
  drawNodes(ctx, nodes);

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, view: ViewState) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  const gridSize = 80;
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  const offsetX = view.offsetX % gridSize;
  const offsetY = view.offsetY % gridSize;
  for (let x = -gridSize; x < ctx.canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x + offsetX, 0);
    ctx.lineTo(x + offsetX, ctx.canvas.height);
    ctx.stroke();
  }
  for (let y = -gridSize; y < ctx.canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + offsetY);
    ctx.lineTo(ctx.canvas.width, y + offsetY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEdges(ctx: CanvasRenderingContext2D, nodes: PositionedNode[], scale: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(114,245,228,0.4)";
  ctx.lineWidth = 2 / scale;
  ctx.shadowColor = "rgba(114,245,228,0.25)";
  ctx.shadowBlur = 10;
  nodes.forEach((node) => {
    if (node.parentId === undefined) return;
    const parent = nodes[node.parentId];
    const startX = parent.x;
    const startY = parent.y + NODE_HEIGHT;
    const endX = node.x;
    const endY = node.y;
    const cpOffset = Math.max(40, (endY - startY) * 0.45);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(startX, startY + cpOffset, endX, endY - cpOffset, endX, endY);
    ctx.stroke();
  });
  ctx.restore();
}

function drawNodes(ctx: CanvasRenderingContext2D, nodes: PositionedNode[]) {
  nodes.forEach((node) => {
    const x = node.x - NODE_WIDTH / 2;
    const y = node.y;
    const radius = 14;
    ctx.save();
    ctx.shadowColor = "rgba(56,189,248,0.25)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(6,12,30,0.92)";
    roundRect(ctx, x, y, NODE_WIDTH, NODE_HEIGHT, radius);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "600 11px 'Geist Mono', 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`d${node.depth}`, node.x, y + 16);

    ctx.fillStyle = "#72f5e4";
    ctx.font = "600 14px 'Geist', 'Inter', sans-serif";
    ctx.fillText(node.type, node.x, y + 34);

    if (node.value) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px 'Geist', 'Inter', sans-serif";
      const truncated = node.value.length > 28 ? `${node.value.slice(0, 28)}…` : node.value;
      ctx.fillText(truncated, node.x, y + 52);
    }
    ctx.restore();
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
