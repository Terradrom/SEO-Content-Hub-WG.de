"use client";
import { useState } from "react";
import Card from "./Card";
import { TYPES, MEDIA_STATUSES } from "../lib/data";

export default function MediaBoard({ items, onOpenCard, onMove }) {
  const [filterType, setFilterType] = useState("All");
  const [dragOverCol, setDragOverCol] = useState(null);

  const eligible = items.filter((i) => i.mediaStatus && i.mediaStatus !== "Done");
  const filtered = eligible.filter((i) => filterType === "All" || i.type === filterType);

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
        <div className="hint">only pieces the upload team has already gone live with show up here</div>
      </div>

      <div className="board cols4">
        {MEDIA_STATUSES.map((status) => {
          const colItems = filtered.filter((i) => i.mediaStatus === status);
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
      <p className="note">
        <b>Handoff:</b> an item lands here automatically the moment the upload team marks it Live. Moving it to{" "}
        <b>Ready for upload</b> sends it back to the Upload Team&apos;s Queued column, marked pink so it&apos;s clear
        it&apos;s a media re-upload, not a first-time publish.
      </p>
    </>
  );
}
