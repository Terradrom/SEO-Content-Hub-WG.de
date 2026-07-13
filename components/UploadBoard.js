"use client";
import { useState } from "react";
import Card from "./Card";
import { TYPES, UPLOAD_STATUSES } from "../lib/data";

export default function UploadBoard({ items, onOpenCard, onMove }) {
  const [filterType, setFilterType] = useState("All");
  const [dragOverCol, setDragOverCol] = useState(null);

  const eligible = items.filter((i) => i.contentStatus === "Ready for Upload");
  const waiting = items.length - eligible.length;
  const filtered = eligible.filter((i) => filterType === "All" || i.type === filterType);
  const issueCount = items.filter((i) => i.uploadStatus === "Issues").length;

  return (
    <>
      <div className="filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">All content types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <div className="hint">
          {waiting} piece{waiting === 1 ? "" : "s"} still with the content team
        </div>
      </div>

      <div className="board cols4">
        {UPLOAD_STATUSES.map((status) => {
          const colItems = filtered.filter((i) => i.uploadStatus === status);
          return (
            <div key={status} className={`col ${dragOverCol === status ? "dragover" : ""}`}>
              <div className="col-head">
                <h3>{status}</h3>
                <span className="count">{colItems.length}</span>
              </div>
              <div
                className="col-body"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(status);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const id = e.dataTransfer.getData("text/plain");
                  onMove(id, status);
                }}
              >
                {colItems.length === 0 ? (
                  <div className="empty-col">—</div>
                ) : (
                  colItems.map((item) => <Card key={item.id} item={item} onOpen={onOpenCard} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bonus">
        <div className="b-title">
          Upload quality bonus
          <small>Fewer than 3 upload issues across the team keeps the bonus alive — same rule as the sheet.</small>
        </div>
        <div className="b-stat">
          <div className="n">{issueCount}</div>
          <div className="l">Issues logged</div>
        </div>
      </div>
    </>
  );
}
