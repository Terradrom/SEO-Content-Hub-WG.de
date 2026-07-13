"use client";
import { useState } from "react";
import { getRacerSeeds } from "../lib/data";

function paceStatus(r, day) {
  const expected = Math.min(100, Math.round((day / r.bonusDay) * 100));
  return r.pct >= expected ? "ahead" : "behind";
}

export default function RaceTrack() {
  const [racers, setRacers] = useState(() => getRacerSeeds());
  const [day, setDay] = useState(3);
  const [winner, setWinner] = useState(null);
  const totalDays = racers[0]?.totalDays ?? 30;
  const bonusDay = racers[0]?.bonusDay ?? 10;

  function advanceDay() {
    if (winner) return;
    const nextDay = Math.min(totalDays, day + 1);
    setDay(nextDay);
    setRacers((prev) => {
      let newWinner = null;
      const updated = prev.map((r) => {
        if (r.pct >= 100) return r;
        const gain = 4 + Math.round(Math.random() * 10);
        const pct = Math.min(100, r.pct + gain);
        if (pct >= 100 && nextDay <= r.bonusDay && !newWinner) newWinner = r.id;
        return { ...r, pct };
      });
      if (newWinner) setWinner(newWinner);
      return updated;
    });
  }

  function boost(id) {
    if (winner) return;
    setRacers((prev) =>
      prev.map((r) => {
        if (r.id !== id || r.pct >= 100) return r;
        const pct = Math.min(100, r.pct + 15);
        if (pct >= 100 && day <= r.bonusDay && !winner) setWinner(id);
        return { ...r, pct };
      })
    );
  }

  function reset() {
    setRacers(getRacerSeeds());
    setDay(3);
    setWinner(null);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>🚀 Speed Race — Content Team</h2>
          <p>First writer to 100% of their monthly goal, at least 2 weeks before the deadline, takes the lead and wins 50 RM.</p>
        </div>
        <span className="rule-chip">
          Day {day} of {totalDays} · bonus line at day {bonusDay}
        </span>
      </div>

      <div className="race-track">
        <div className="stars" />
        {racers.map((r) => {
          const status = paceStatus(r, day);
          return (
            <div className="lane" key={r.id}>
              <div className="lane-label">
                <b>{r.name}</b>
                <span style={{ color: "var(--muted)" }}>{r.role}</span>
                <span className={`pace-chip ${status}`}>{status}</span>
              </div>
              <div className="lane-track">
                <div className="bonus-zone" />
                <div className="finish" />
                <div className="rocket" style={{ left: `${r.pct}%` }}>
                  {r.pct >= 100 ? "🏁" : "🚀"}
                  {r.pct < 100 && <span className="flame" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`winner-banner ${winner ? "show" : ""}`}>
        🏆 {winner ? racers.find((r) => r.id === winner)?.name : ""} crossed 100% before the 2-week line — wins the 50 RM
        speed bonus.
      </div>

      <div className="lane-controls">
        <button className="sim-btn" onClick={advanceDay}>
          + simulate a day
        </button>
        {racers.map((r) => (
          <button className="sim-btn" key={r.id} onClick={() => boost(r.id)}>
            boost {r.name}
          </button>
        ))}
        <button className="sim-btn reset" onClick={reset}>
          reset race
        </button>
      </div>
    </section>
  );
}
