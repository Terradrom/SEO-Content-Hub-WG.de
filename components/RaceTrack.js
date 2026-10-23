"use client";
import { derivePeople } from "../lib/data";

// Speed-Bonus für das Content-Team
const PRIZE = "35 USD";

function computeRacers(items) {
  const people = derivePeople(items);
  return people.map((name) => {
    const mine = items.filter((i) => i.person === name);
    const done = mine.filter((i) => i.contentStatus === "Online").length;
    const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
    return { id: name.toLowerCase(), name, done, total: mine.length, pct };
  });
}

export default function RaceTrack({ items }) {
  const racers = computeRacers(items);
  const winner = racers.find((r) => r.pct >= 100);

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>🚀 Speed-Rennen – Content-Team</h2>
          <p>Wer als Erste:r 100 % der eigenen Aufgaben auf Online gebracht hat, gewinnt den Speed-Bonus von {PRIZE}.</p>
        </div>
        <span className="rule-chip">live – aktualisiert sich, sobald Karten auf Online gehen</span>
      </div>

      <div className="race-track">
        {racers.length === 0 && <div className="empty-col">Noch keine Aufgaben – das Rennen startet nach dem Import.</div>}
        {racers.map((r) => (
          <div className="lane" key={r.id}>
            <div className="lane-label">
              <b>{r.name}</b>
              <span className="pace-chip">
                {r.done}/{r.total} · {r.pct}%
              </span>
            </div>
            <div className="lane-track">
              <div className="finish" />
              <div className="rocket" style={{ left: `${r.pct}%` }}>
                {r.pct >= 100 ? "🏁" : "🚀"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`winner-banner ${winner ? "show" : ""}`}>
        🏆 {winner ? winner.name : ""} hat 100 % der eigenen Aufgaben online – Speed-Bonus von {PRIZE} gewonnen.
      </div>
    </section>
  );
}
