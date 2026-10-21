"use client";
import { useState } from "react";
import Card from "./Card";
import { CONTENT_STATUSES, TYPES, PERIODS, inPeriod, byPlanOrder, deriveClusters, derivePeople } from "../lib/data";

export default function ContentBoard({ items, onOpenCard, onMove, profile }) {
  const isManager = profile?.role === "manager";
  const ownName = profile?.display_name;
  const [filterPerson, setFilterPerson] = useState("All");
  const [period, setPeriod] = useState("1");
  const [filterCluster, setFilterCluster] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [dragOverCol, setDragOverCol] = useState(null);
  // On phones only one status column is shown at a time.
  const [mobileCol, setMobileCol] = useState(CONTENT_STATUSES[0]);
  const people = derivePeople(items);

  // Writers see their own tasks; if nothing is assigned yet they see the
  // whole plan so they can get started.
  const ownItems = items.filter((i) => i.person && i.person === ownName);
  const visibleBase = isManager || ownItems.length === 0 ? items : ownItems;
  const inThisPeriod = visibleBase.filter((i) => inPeriod(i, period));
  const clusters = deriveClusters(inThisPeriod);
  const effectiveCluster = clusters.includes(filterCluster) ? filterCluster : "All";

  const filtered = inThisPeriod
    .filter((i) => !isManager || filterPerson === "All" || (filterPerson === "none" ? !i.person : i.person === filterPerson))
    .filter((i) => effectiveCluster === "All" || i.cluster === effectiveCluster)
    .filter((i) => filterType === "All" || i.type === filterType)
    .sort(byPlanOrder);

  const done = filtered.filter((i) => i.contentStatus === "Online").length;

  return (
    <>
      <div className="filters">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Zeitraum">
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select value={effectiveCluster} onChange={(e) => setFilterCluster(e.target.value)} aria-label="Cluster">
          <option value="All">Alle Cluster ({clusters.length})</option>
          {clusters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Seitentyp">
          <option value="All">Alle Seitentypen</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {isManager ? (
          <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} aria-label="Person">
            <option value="All">Alle Autor:innen</option>
            <option value="none">Noch niemand zugewiesen</option>
            {people.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <span className="hint">{ownItems.length ? `deine Aufgaben (${ownName})` : "noch nichts zugewiesen – du siehst den ganzen Plan"}</span>
        )}
        <div className="spacer" />
        <div className="hint">
          {done}/{filtered.length} online · Karte antippen für das SEO-Briefing
        </div>
      </div>

      <div className="col-switch" role="tablist" aria-label="Spalte">
        {CONTENT_STATUSES.map((status) => (
          <button key={status} className={mobileCol === status ? "active" : ""} onClick={() => setMobileCol(status)} role="tab" aria-selected={mobileCol === status}>
            {status} <span>{filtered.filter((i) => i.contentStatus === status).length}</span>
          </button>
        ))}
      </div>

      <div className="board cols3">
        {CONTENT_STATUSES.map((status) => {
          const colItems = filtered.filter((i) => i.contentStatus === status);
          return (
            <div key={status} className={`col ${dragOverCol === status ? "dragover" : ""} ${mobileCol === status ? "" : "col-mobile-hidden"}`}>
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
        <b>Reihenfolge:</b> Die Karten stehen in Plan-Reihenfolge – pro Cluster erst die Kategorie, dann ihre
        Unterkategorien, dann die Produkte. So verlinken sich fertige Seiten direkt gegenseitig.{" "}
        <b>Übergabe:</b> Sobald eine Karte auf <b>Online</b> steht, landet sie automatisch beim Media-Team.
      </p>
    </>
  );
}
