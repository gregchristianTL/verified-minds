"use client";

import { motion } from "framer-motion";

/**
 * Props for the Sparkline component
 */
interface SparklineProps {
  /** Data points to plot */
  points: number[];
  /** SVG width in px */
  width?: number;
  /** SVG height in px */
  height?: number;
  /** Stroke color */
  color?: string;
  /** Fill area color */
  fillColor?: string;
  /** Whether to animate the draw-in */
  animate?: boolean;
}

/**
 * Sparkline - Minimal SVG line chart for earnings visualizations.
 * Draws a cumulative line with optional fill area and draw-in animation.
 * @param root0
 * @param root0.points
 * @param root0.width
 * @param root0.height
 * @param root0.color
 * @param root0.fillColor
 * @param root0.animate
 */
export default function Sparkline({
  points,
  width = 200,
  height = 48,
  color = "rgb(52, 211, 153)",
  fillColor = "rgba(52, 211, 153, 0.08)",
  animate = true,
}: SparklineProps): React.ReactElement {
  if (points.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const padding = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, i) => ({
    x: padding + (i / (points.length - 1)) * (width - padding * 2),
    y: padding + (1 - (val - min) / range) * (height - padding * 2),
  }));

  const linePath = coords
    .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
    .join(" ");

  const fillPath = `${linePath} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  const pathLength = coords.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = coords[i - 1];
    return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
  }, 0);

  const endPt = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {animate ? (
        <motion.path
          d={fillPath}
          fill={fillColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
      ) : (
        <path d={fillPath} fill={fillColor} />
      )}

      {animate ? (
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ pathLength: undefined }}
          strokeDasharray={pathLength}
          strokeDashoffset={0}
        />
      ) : (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {animate ? (
        <motion.circle
          cx={endPt.x}
          cy={endPt.y}
          r={2.5}
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        />
      ) : (
        <circle cx={endPt.x} cy={endPt.y} r={2.5} fill={color} />
      )}
    </svg>
  );
}
