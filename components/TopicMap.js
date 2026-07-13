"use client";
import { useMemo, useState } from "react";
import { HUBS, TOPIC_NODES, TOPIC_CROSS_EDGES } from "../lib/data";

function hubCenter(hub) {
  const r = (hub.angle * Math.PI) / 180;
  return { x: 450 + 190 * Math.cos(r), y: 350 + 190 * Math.sin(r) };
}

function computePositions() {
  const hubs = HUBS.map((h) => ({ ...h, ...hubCenter(h) }));
  const nodes = TOPIC_NODES.map((n) => ({ ...n }));
  hubs.forEach((hub) => {
    const mine = nodes.filter((n) => n.hub === hub.id);
    mine.forEach((n, i) => {
      const a = (i / mine.length) * 2 * Math.PI - Math.PI / 2;
      n.x = hub.x + 92 * Math.cos(a);
      n.y = hub.y + 92 * Math.sin(a);
    });
  });
  return { hubs, nodes };
}

export default function TopicMap() {
  const { hubs, nodes } = useMemo(() => computePositions(), []);
  const [activeId, setActiveId] = useState(null);

  const nodeById = (id) => nodes.find((n) => n.id === id);
  const hubOf = (node) => hubs.find((h) => h.id === node.hub);
  const active = activeId ? nodeById(activeId) : null;
  const connected = active
    ? TOPIC_CROSS_EDGES.filter((e) => e[0] === active.id || e[1] === active.id).map((e) =>
        e[0] === active.id ? e[1] : e[0]
      )
    : [];

  return (
    <>
      <div className="map-shell">
        <div className="map-grid" />
        <div className="map-legend">
          {hubs.map((h) => (
            <div className="legend-item" key={h.id}>
              <span className="legend-dot" style={{ background: h.color }} />
              {h.label}
            </div>
          ))}
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "var(--paper)", opacity: 0.5 }} />
            category
          </div>
          <div className="legend-item" style={{ marginLeft: "auto" }}>
            click a node to trace its links
          </div>
        </div>

        <svg viewBox="0 0 900 700" style={{ position: "relative", zIndex: 1, width: "100%", display: "block" }}>
          {nodes.map((n) => {
            const h = hubOf(n);
            return (
              <line
                key={`hier-${n.id}`}
                x1={h.x}
                y1={h.y}
                x2={n.x}
                y2={n.y}
                stroke={h.color}
                strokeOpacity="0.15"
                strokeWidth="1"
              />
            );
          })}

          {TOPIC_CROSS_EDGES.map(([a, b], idx) => {
            const na = nodeById(a);
            const nb = nodeById(b);
            const mx = (na.x + nb.x) / 2;
            const my = (na.y + nb.y) / 2;
            const dx = nb.x - na.x;
            const dy = nb.y - na.y;
            const cx = mx - dy * 0.15;
            const cy = my + dx * 0.15;
            const color = hubOf(na).color;
            const isActive = active && (a === active.id || b === active.id);
            const dim = active && !isActive;
            const path = `M${na.x},${na.y} Q${cx},${cy} ${nb.x},${nb.y}`;
            return (
              <g key={`edge-${idx}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 2 : 1.2}
                  strokeOpacity={dim ? 0.08 : isActive ? 0.9 : 0.35}
                />
                <circle r="2.6" fill={color} opacity={dim ? 0.15 : 0.95}>
                  <animateMotion dur={`${3 + (idx % 4) * 0.6}s`} repeatCount="indefinite" path={path} />
                </circle>
              </g>
            );
          })}

          {hubs.map((h) => (
            <g key={h.id}>
              <circle cx={h.x} cy={h.y} r="15" fill={h.color} opacity="0.9" />
              <circle cx={h.x} cy={h.y} r="24" fill="none" stroke={h.color} strokeOpacity="0.35" strokeWidth="1">
                <animate attributeName="r" values="22;28;22" dur="3.5s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.4;0.05;0.4" dur="3.5s" repeatCount="indefinite" />
              </circle>
              <text x={h.x} y={h.y - 32} textAnchor="middle" fontSize="11" fontWeight="600" fill={h.color}>
                {h.label}
              </text>
            </g>
          ))}

          {nodes.map((n) => {
            const h = hubOf(n);
            const r = n.kind === "category" ? 8 : 6;
            const isActive = active && n.id === active.id;
            const isConnected = connected.includes(n.id);
            const dim = active && !isActive && !isConnected;
            const label = n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label;
            return (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                opacity={dim ? 0.25 : 1}
                onClick={() => setActiveId(activeId === n.id ? null : n.id)}
              >
                <circle
                  className="node-circle"
                  cx={n.x}
                  cy={n.y}
                  r={isActive ? r + 3 : r}
                  fill={h.color}
                  fillOpacity={n.kind === "category" ? 0.9 : 0.7}
                  stroke={isActive ? "#fff" : "none"}
                  strokeWidth="1.5"
                />
                <text x={n.x} y={n.y + r + 12} textAnchor="middle" fontSize="9.5" fill={isActive ? "#fff" : "var(--muted)"}>
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="map-panel">
          {active ? (
            <>
              <b>{active.label}</b> — {hubOf(active).label}, {active.kind}
              <br />
              links to:{" "}
              {connected.length
                ? connected.map((id) => (
                    <span className="chip" key={id}>
                      {nodeById(id).label}
                    </span>
                  ))
                : <span style={{ color: "var(--muted)" }}>nothing yet</span>}
            </>
          ) : (
            <>
              Click any node to see how it&apos;s meant to interlink — this is the internal linking plan a writer or the
              upload team would follow, made visible instead of buried in a &quot;🔗 Link to:&quot; cell.
            </>
          )}
        </div>
      </div>
      <p className="note">
        <b>Why this view matters:</b> your sheet already encodes a linking strategy in the &quot;Topic Ideas&quot;
        column (🔗 Link to: X, Y, Z) — it&apos;s just invisible until someone reads every cell. This turns it into
        something the whole team can see and reason about at a glance.
      </p>
      <p className="note">
        <b>TODO:</b> this graph is seeded with a representative slice of real cross-links from the sheet (see{" "}
        <code>lib/data.js</code>). Generating it for the full ~127-item dataset is a data pass, not new
        functionality — see README.
      </p>
    </>
  );
}
