"use client";
import { derivePeople } from "../lib/data";

function computeRacers(items) {
  const people = derivePeople(items);
  return people.map((name) => {
    const mine = items.filter((i) => i.person === name);
    const done = mine.filter((i) => i.contentStatus === "Ready for Upload").length;
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
          <h2>🚀 Speed Race — Content Team</h2>
          <p>First writer to 100% of their assigned pieces moved to Ready for Upload takes the lead and wins 50 RM.</p>
        </div>
        <span className="rule-chip">live — updates as items move to Ready for Upload</span>
      </div>

      <div className="race-track">
        <div className="stars" />
        {racers.map((r) => (
          <div className="lane" key={r.id}>
            <div className="lane-label">
              <b>{r.name}</b>
              <span className="pace-chip ahead">
                {r.done}/{r.total} · {r.pct}%
              </span>
            </div>
            <div className="lane-track">
              <div className="finish" />
              <div className="rocket" style={{ left: `${r.pct}%` }}>
                {r.pct >= 100 ? "🏁" : "🚀"}
                {r.pct < 100 && <span className="flame" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`winner-banner ${winner ? "show" : ""}`}>
        🏆 {winner ? winner.name : ""} reached 100% of their assigned pieces — wins the 50 RM speed bonus.
      </div>
    </section>
  );
}
