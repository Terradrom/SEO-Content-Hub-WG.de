"use client";
import { daysUntil, fmtDate } from "../lib/format";

export default function Card({ item, onOpen, onDragStart }) {
  const d = daysUntil(item.deadline);
  const overdue = d < 0 && item.contentStatus !== "Online";
  // Text and images both published — without a marker this looks
  // identical to a card that's online but still waiting for media.
  const fullyDone = item.contentStatus === "Online" && item.mediaStatus === "Medien online";
  const mediaInProgress = item.contentStatus === "Online" && item.mediaStatus && item.mediaStatus !== "Medien online";

  return (
    <div
      className="card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart && onDragStart(item.id);
      }}
      onClick={() => onOpen(item.id)}
    >
      <div className="tag-row">
        <span className="type-tag">{item.type}</span>
        <span className={`stamp imp-${item.importance}`}>{item.importance}</span>
      </div>
      {fullyDone && <div className="done-badge">✅ Text + Medien online – komplett erledigt</div>}
      {mediaInProgress && <div className="progress-badge">🎨 Medien in Arbeit ({item.mediaStatus})</div>}
      <h4>{item.topic}</h4>
      <div className="kw-line">{(item.keywords || "").split(",").slice(0, 3).join(", ")}</div>
      <div className="foot">
        <span style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <span className="who-chip">{item.person}</span>
          {item.mediaPerson && <span className="who-chip who-chip-media">🎨 {item.mediaPerson}</span>}
        </span>
        <span className={`deadline ${overdue ? "overdue" : ""}`}>
          {overdue ? "⚠ " : ""}
          {fmtDate(item.deadline)}
        </span>
      </div>
    </div>
  );
}
