"use client";
import { useState } from "react";
import { UPLOADER_SEEDS } from "../lib/data";

const MANAGER_PIN = "2026"; // TODO(backend): replace with real auth (see README)

function makeShards() {
  return Array.from({ length: 7 }, () => {
    const angle = Math.random() * 2 * Math.PI;
    const dist = 18 + Math.random() * 14;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      rot: Math.random() * 360,
      left: 14 + Math.random() * 4,
      top: 14 + Math.random() * 4,
    };
  });
}

export default function HeartsPanel() {
  const [uploaders, setUploaders] = useState(() => UPLOADER_SEEDS.map((u) => ({ ...u })));
  const [managerMode, setManagerMode] = useState(false);
  const [pin, setPin] = useState("");
  const [breaking, setBreaking] = useState(null); // { ownerId, liveIndex, shards }

  function startReview(id) {
    setUploaders((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "progress", lives: 3, reviewDay: 0, mistakes: 0 } : u))
    );
  }

  function advanceReviewDay() {
    setUploaders((prev) =>
      prev.map((u) => {
        if (u.status !== "progress") return u;
        const reviewDay = Math.min(u.reviewLength, u.reviewDay + 1);
        const status = reviewDay >= u.reviewLength ? (u.lives > 0 ? "won" : "lost") : "progress";
        return { ...u, reviewDay, status };
      })
    );
  }

  function requestBreak(id, liveIndex) {
    if (!managerMode || breaking) return;
    const u = uploaders.find((x) => x.id === id);
    if (!u || u.status !== "progress" || u.lives <= 0) return;
    setBreaking({ ownerId: id, liveIndex, shards: makeShards() });
    setTimeout(() => {
      setUploaders((prev) =>
        prev.map((x) => {
          if (x.id !== id) return x;
          const lives = x.lives - 1;
          return { ...x, lives, mistakes: x.mistakes + 1, status: lives <= 0 ? "lost" : x.status };
        })
      );
      setBreaking(null);
    }, 260);
  }

  function login() {
    setManagerMode(pin === MANAGER_PIN);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>❤ Quality Hearts — Upload Team</h2>
          <p>
            An uploader starts a 2-week review with 3 hearts once they set something live. Each confirmed mistake
            breaks one heart. Lose all 3 before review ends → no bonus. End review with a heart left → 35 RM.
          </p>
        </div>
        <span className="rule-chip">{managerMode ? "🔓 manager mode" : "🔒 viewer mode"}</span>
      </div>

      <div className="manager-gate">
        {managerMode ? (
          <>
            <span className="status on">Logged in as manager — you can break hearts</span>
            <button
              style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--line-strong)" }}
              onClick={() => setManagerMode(false)}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <input
              type="password"
              placeholder="manager PIN"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button onClick={login}>Unlock manager mode</button>
            <span className="status">only a logged-in manager can break a heart</span>
          </>
        )}
        <small>Demo PIN: 2026 — in the real build this is your actual manager login, not a shared code.</small>
      </div>

      <div className="up-grid">
        {uploaders.map((u) => {
          const pct = Math.round((u.reviewDay / u.reviewLength) * 100);
          return (
            <div className="up-card" key={u.id}>
              <div className="up-head">
                <b>{u.name}</b>
                <span className={`up-status ${u.status}`}>{u.status === "progress" ? "in review" : u.status}</span>
              </div>
              <div className="hearts-row">
                {[0, 1, 2].map((i) => {
                  const alive = i < u.lives;
                  const isBreakingThis = breaking && breaking.ownerId === u.id && breaking.liveIndex === i;
                  const canBreak = alive && managerMode && u.status === "progress";
                  return (
                    <div
                      className={`heart-slot ${canBreak ? "breakable alive" : ""}`}
                      key={i}
                      onClick={() => canBreak && requestBreak(u.id, i)}
                    >
                      <svg
                        className={`heart-svg ${isBreakingThis ? "pop" : ""}`}
                        viewBox="0 0 32 29"
                        fill={alive && !isBreakingThis ? "var(--rust)" : "none"}
                        stroke={alive && !isBreakingThis ? "none" : "var(--line-strong)"}
                        strokeWidth="1.5"
                      >
                        <path d="M16 28C16 28 2 19 2 9.5C2 4.8 5.8 1 10.5 1C13 1 15 2.2 16 4C17 2.2 19 1 21.5 1C26.2 1 30 4.8 30 9.5C30 19 16 28 16 28Z" />
                      </svg>
                      {isBreakingThis &&
                        breaking.shards.map((s, si) => (
                          <div
                            className="shard go"
                            key={si}
                            style={{
                              left: s.left,
                              top: s.top,
                              "--tx": `${s.tx}px`,
                              "--ty": `${s.ty}px`,
                              "--rot": `${s.rot}deg`,
                            }}
                          />
                        ))}
                    </div>
                  );
                })}
              </div>
              <div className="review-bar-track">
                <div className="review-bar-fill" style={{ width: `${u.status === "idle" ? 0 : pct}%` }} />
              </div>
              <div className="up-meta">
                <span>{u.status === "idle" ? "not started" : `day ${u.reviewDay}/${u.reviewLength}`}</span>
                <span>
                  {u.mistakes} mistake{u.mistakes === 1 ? "" : "s"} found
                </span>
              </div>
              <div className="up-actions">
                {u.status === "idle" && (
                  <button className="mini-btn" onClick={() => startReview(u.id)}>
                    Set live &amp; start review
                  </button>
                )}
                {u.status === "progress" && (
                  <button className="mini-btn" onClick={advanceReviewDay}>
                    + advance review day
                  </button>
                )}
                {u.status === "won" && (
                  <span className="mini-btn" style={{ color: "var(--sage)", borderColor: "var(--sage)" }}>
                    🎉 35 RM earned
                  </span>
                )}
                {u.status === "lost" && (
                  <span className="mini-btn danger" style={{ color: "var(--rust)", borderColor: "var(--rust)" }}>
                    bonus lost
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
