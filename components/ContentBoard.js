"use client";
import { useState } from "react";
import Card from "./Card";
import { CONTENT_STATUSES, TYPES, derivePeople } from "../lib/data";

export default function ContentBoard({ items, onOpenCard, onMove, profile }) {
  const isManager = profile?.role === "manager";
  const ownName = profile?.display_name;
  const [filterPerson, setFilterPerson] = useState(isManager ? "All" : ownName || "All");
  const [filterType, setFilterType] = useState("All");
  const [dragOverCol, setDragOverCol] = useState(null);
  const people = derivePeople(items);

  const effectivePerson = isManager ? filterPerson : ownName || "All";
  const filtered = items.filter(
    (i) => (effectivePerson === "All" || i.person === effectivePerson) && (filterType === "All" || i.type === filterType)
  );

  return (
    <>
      <div className="filters">
        {isManager ? (
          <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}>
            <option value="All">Alle Autor:innen</option>
            {people.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <span className="hint">deine Aufgaben ({ownName || "nicht zugewiesen"})</span>
        )}
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="All">Alle Content-Typen</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <div className="hint">Karte ziehen oder antippen zum Öffnen</div>
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
        <b>Übergabe:</b> Sobald eine Karte auf <b>Online</b> steht, landet sie automatisch beim Media-Team in der
        Spalte <b>Bereit für Medien</b> – keine extra Nachricht nötig.
      </p>
    </>
  );
}
