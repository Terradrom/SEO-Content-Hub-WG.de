"use client";
import { useState } from "react";
import Card from "./Card";
import { CONTENT_STATUSES, PEOPLE, TYPES } from "../lib/data";

export default function ContentBoard({ items, onOpenCard, onMove }) {
  const [filterPerson, setFilterPerson] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [dragOverCol, setDragOverCol] = useState(null);

  const filtered = items.filter(
    (i) => (filterPerson === "All" || i.person === filterPerson) && (filterType === "All" || i.type === filterType)
  );

  return (
    <>
      <div className="filters">
        <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}>
          <option value="All">All writers</option>
          {PEOPLE.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">All content types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <div className="hint">drag a card, or tap it to open</div>
      </div>

      <div className="board cols3">
        {CONTENT_STATUSES.map((status) => {
          const colItems = filtered.filter((i) => i.contentStatus === status);
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
        <b>Handoff:</b> moving a card to <b>Ready for Upload</b> sends it straight into the Upload Team&apos;s Queued
        column — no re-typing, no Slack message needed.
      </p>
    </>
  );
}
