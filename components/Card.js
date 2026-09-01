"use client";
import { daysUntil, fmtDate } from "../lib/format";

export default function Card({ item, onOpen, onDragStart }) {
  const d = daysUntil(item.deadline);
  const overdue = d < 0 && item.contentStatus !== "Ready for Upload";
  const mediaReady = item.mediaStatus === "Ready for upload";
  // Once media_status hits "Done" the full loop (Live -> media team ->
  // back to Upload -> Live again) is finished — text and images are both
  // published. Without a marker this looks identical to a first-time
  // Live item, which is exactly the confusion this badge is for.
  const fullyDone = item.uploadStatus === "Live" && item.mediaStatus === "Done";
  const mediaInProgress =
    item.uploadStatus === "Live" && item.mediaStatus && !["Done", "Ready for upload"].includes(item.mediaStatus);

  return (
    <div
      className={`card ${mediaReady ? "card-media-ready" : ""}`}
      title={mediaReady ? "Media team finished — ready to re-publish with new media" : undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart && onDragStart(item.id);
      }}
      onClick={() => onOpen(item.id)}
    >
      {item.files.length > 0 && <div className="file-flag" title="has attachment" />}
      {item.uploadIssues && <div className="issue-flag" title="has an issue logged" />}
      <div className="tag-row">
        <span className="type-tag">{item.type}</span>
        <span className={`stamp imp-${item.importance}`}>{item.importance}</span>
      </div>
      {fullyDone && <div className="done-badge">✅ Text + media live — fully done</div>}
      {mediaInProgress && <div className="progress-badge">🎨 Media in progress ({item.mediaStatus})</div>}
      <h4>{item.topic}</h4>
      <div className="kw-line">{(item.keywords || "").split(",").slice(0, 3).join(", ")}</div>
      <div className="foot">
        <span style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <span className="who-chip">{item.person}</span>
          {item.uploader && <span className="who-chip who-chip-uploader">🔧 {item.uploader}</span>}
        </span>
        <span className={`deadline ${overdue ? "overdue" : ""}`}>
          {overdue ? "⚠ " : ""}
          {fmtDate(item.deadline)}
        </span>
      </div>
    </div>
  );
}
