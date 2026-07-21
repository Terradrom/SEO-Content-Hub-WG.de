"use client";
import { useMemo, useState } from "react";
import { HUBS, TOPIC_NODES, TOPIC_CROSS_EDGES } from "../lib/data";

const CX = 450;
const CY = 350;
const HUB_RADIUS = 230;

function hubPos(hub) {
  const r = (hub.angle * Math.PI) / 180;
  return { x: CX + HUB_RADIUS * Math.cos(r), y: CY + HUB_RADIUS * Math.sin(r) };
}

function hubOverviewData() {
  const hubs = HUBS.map((h) => ({ ...h, ...hubPos(h) }));
  const nodeHub = new Map(TOPIC_NODES.map((n) => [n.id, n.hub]));
  const pairCounts = new Map();
  for (const [a, b] of TOPIC_CROSS_EDGES) {
    const ha = nodeHub.get(a);
    const hb = nodeHub.get(b);
    if (!ha || !hb || ha === hb) continue;
    const key = [ha, hb].sort().join("::");
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }
  const hubEdges = [...pairCounts.entries()].map(([key, count]) => {
    const [a, b] = key.split("::");
    return { a, b, count };
  });
  return { hubs, hubEdges };
}

function hubDetailData(hubId) {
  const nodes = TOPIC_NODES.filter((n) => n.hub === hubId);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const radius = Math.min(300, 130 + nodes.length * 4);
  const positioned = nodes.map((n, i) => {
    const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    return { ...n, x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
  });
  const intraEdges = TOPIC_CROSS_EDGES.filter(([a, b]) => nodeIds.has(a) && nodeIds.has(b));
  return { nodes: positioned, intraEdges };
}

function nodeById(id) {
  return TOPIC_NODES.find((n) => n.id === id);
}
function hubById(id) {
  return HUBS.find((h) => h.id === id);
}
function connectionsOf(id) {
  return TOPIC_CROSS_EDGES.filter((e) => e[0] === id || e[1] === id).map((e) => (e[0] === id ? e[1] : e[0]));
}

export default function TopicMap() {
  const [selectedHub, setSelectedHub] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");

  const { hubs, hubEdges } = useMemo(hubOverviewData, []);
  const detail = useMemo(() => (selectedHub ? hubDetailData(selectedHub) : null), [selectedHub]);

  const active = activeId ? nodeById(activeId) : null;
  const connected = active ? connectionsOf(active.id) : [];

  const searchResults =
    query.trim().length >= 2
      ? TOPIC_NODES.filter((n) => n.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
      : [];

  function jumpTo(node) {
    setSelectedHub(node.hub);
    setActiveId(node.id);
    setQuery("");
  }

  return (
    <>
      <div className="map-shell">
        <div className="map-grid" />

        <div className="map-search-row">
          <input
            type="text"
            placeholder="Search any page or topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="map-search-results">
              {searchResults.map((n) => (
                <div key={n.id} className="map-search-result" onClick={() => jumpTo(n)}>
                  <span className="legend-dot" style={{ background: hubById(n.hub)?.color }} />
                  {n.label} <span style={{ color: "var(--muted)" }}>· {hubById(n.hub)?.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!selectedHub ? (
          <>
            <div className="map-legend">
              <div className="legend-item" style={{ marginRight: "auto" }}>
                {HUBS.length} hubs · {TOPIC_NODES.length} pages · {TOPIC_CROSS_EDGES.length} internal links — click a
                hub to explore it
              </div>
            </div>
            <svg viewBox="0 0 900 700" style={{ position: "relative", zIndex: 1, width: "100%", display: "block" }}>
              {hubEdges.map((e, idx) => {
                const ha = hubs.find((h) => h.id === e.a);
                const hb = hubs.find((h) => h.id === e.b);
                if (!ha || !hb) return null;
                return (
                  <line
                    key={idx}
                    x1={ha.x}
                    y1={ha.y}
                    x2={hb.x}
                    y2={hb.y}
                    stroke="var(--muted)"
                    strokeOpacity={0.25}
                    strokeWidth={Math.min(6, 0.6 + e.count * 0.35)}
                  />
                );
              })}
              {hubs.map((h) => {
                const r = 22 + Math.sqrt(h.count) * 4;
                return (
                  <g key={h.id} style={{ cursor: "pointer" }} onClick={() => setSelectedHub(h.id)}>
                    <circle cx={h.x} cy={h.y} r={r} fill={h.color} opacity="0.85" className="node-circle" />
                    <circle cx={h.x} cy={h.y} r={r + 8} fill="none" stroke={h.color} strokeOpacity="0.3" strokeWidth="1">
                      <animate attributeName="r" values={`${r + 6};${r + 12};${r + 6}`} dur="3.5s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.4;0.05;0.4" dur="3.5s" repeatCount="indefinite" />
                    </circle>
                    <text x={h.x} y={h.y - r - 12} textAnchor="middle" fontSize="12" fontWeight="600" fill={h.color}>
                      {h.label}
                    </text>
                    <text x={h.x} y={h.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#04140f">
                      {h.count}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="map-panel">
              Click any hub above to see its real pages and how they interlink. Line thickness between hubs shows how
              many links cross between them.
            </div>
          </>
        ) : (
          <>
            <div className="map-legend">
              <div className="legend-item" onClick={() => { setSelectedHub(null); setActiveId(null); }} style={{ cursor: "pointer", color: "var(--accent)" }}>
                ← All hubs
              </div>
              <div className="legend-item" style={{ marginLeft: "auto" }}>
                {hubById(selectedHub)?.label} · {detail.nodes.length} pages · click a node to trace its links
              </div>
            </div>
            <svg viewBox="0 0 900 700" style={{ position: "relative", zIndex: 1, width: "100%", display: "block" }}>
              {detail.intraEdges.map(([a, b], idx) => {
                const na = detail.nodes.find((n) => n.id === a);
                const nb = detail.nodes.find((n) => n.id === b);
                if (!na || !nb) return null;
                const isActive = active && (a === active.id || b === active.id);
                const dim = active && !isActive;
                const mx = (na.x + nb.x) / 2;
                const my = (na.y + nb.y) / 2;
                const dx = nb.x - na.x;
                const dy = nb.y - na.y;
                const cx = mx - dy * 0.12;
                const cy = my + dx * 0.12;
                const path = `M${na.x},${na.y} Q${cx},${cy} ${nb.x},${nb.y}`;
                const color = hubById(selectedHub)?.color;
                return (
                  <g key={idx}>
                    <path d={path} fill="none" stroke={color} strokeWidth={isActive ? 2 : 1.1} strokeOpacity={dim ? 0.06 : isActive ? 0.9 : 0.3} />
                    <circle r="2.4" fill={color} opacity={dim ? 0.1 : 0.9}>
                      <animateMotion dur={`${3 + (idx % 4) * 0.6}s`} repeatCount="indefinite" path={path} />
                    </circle>
                  </g>
                );
              })}
              {detail.nodes.map((n) => {
                const r = n.kind === "category" ? 8 : 6;
                const isActive = active && n.id === active.id;
                const isConnected = connected.includes(n.id);
                const dim = active && !isActive && !isConnected;
                const crossHubCount = active ? 0 : connectionsOf(n.id).filter((id) => nodeById(id)?.hub !== n.hub).length;
                return (
                  <g key={n.id} style={{ cursor: "pointer" }} opacity={dim ? 0.22 : 1} onClick={() => setActiveId(activeId === n.id ? null : n.id)}>
                    <circle
                      className="node-circle"
                      cx={n.x}
                      cy={n.y}
                      r={isActive ? r + 3 : r}
                      fill={hubById(selectedHub)?.color}
                      fillOpacity={n.kind === "category" ? 0.9 : 0.65}
                      stroke={isActive ? "#fff" : "none"}
                      strokeWidth="1.5"
                    />
                    {crossHubCount > 0 && (
                      <text x={n.x + r + 3} y={n.y - r} fontSize="7.5" fill="var(--muted)">
                        +{crossHubCount}
                      </text>
                    )}
                    <text x={n.x} y={n.y + r + 11} textAnchor="middle" fontSize="9" fill={isActive ? "#fff" : "var(--muted)"}>
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="map-panel">
              {active ? (
                <>
                  <b>{active.label}</b> — {hubById(active.hub)?.label}, {active.kind}
                  <br />
                  links to:{" "}
                  {connected.length ? (
                    connected.map((id) => {
                      const n = nodeById(id);
                      const sameHub = n?.hub === selectedHub;
                      return (
                        <span className="chip" key={id} onClick={() => !sameHub && jumpTo(n)} style={{ cursor: sameHub ? "default" : "pointer" }}>
                          {n?.label} {!sameHub && `(${hubById(n?.hub)?.label})`}
                        </span>
                      );
                    })
                  ) : (
                    <span style={{ color: "var(--muted)" }}>nothing yet</span>
                  )}
                </>
              ) : (
                <>Click any node to see how it&apos;s meant to interlink. The small +N badge means it also links outside this hub.</>
              )}
            </div>
          </>
        )}
      </div>
      <p className="note">
        <b>Real linking data:</b> generated from the sheet&apos;s &quot;Topic Ideas&quot; column (🔗 Link to: X, Y,
        Z) across all {TOPIC_NODES.length} items — {TOPIC_CROSS_EDGES.length} links matched to an existing page. A
        few references to not-yet-created pages (e.g. sub-subcategories still planned) couldn&apos;t be matched and
        are left out; re-run <code>scripts/build_topic_map.mjs</code> against a fresh export to update this.
      </p>
    </>
  );
}
