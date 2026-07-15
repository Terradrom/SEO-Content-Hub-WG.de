"use client";
import { useEffect, useState } from "react";
import { derivePeople } from "../lib/data";
import { daysUntil, fmtDate } from "../lib/format";

function nextDeadlineFor(items, person) {
  const upcoming = items
    .filter((i) => i.person === person && i.contentStatus !== "Ready for Upload")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  if (!upcoming) return "all clear";
  const d = daysUntil(upcoming.deadline);
  return d < 0 ? `${Math.abs(d)}d overdue` : `due in ${d}d`;
}

function NotificationPauses() {
  const [profiles, setProfiles] = useState([]);
  const [pauses, setPauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ profileId: "", startsOn: "", endsOn: "", note: "" });
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/profiles").then((r) => r.json()),
      fetch("/api/notification-pauses").then((r) => r.json()),
    ])
      .then(([p, pz]) => {
        setProfiles(p);
        setPauses(pz);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function addPause(e) {
    e.preventDefault();
    if (!form.profileId || !form.startsOn || !form.endsOn) return;
    await fetch("/api/notification-pauses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ profileId: "", startsOn: "", endsOn: "", note: "" });
    load();
  }

  async function removePause(id) {
    await fetch(`/api/notification-pauses/${id}`, { method: "DELETE" });
    load();
  }

  async function runCheckNow() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch("/api/cron/overdue-check");
      setCheckResult(await res.json());
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="upload-gate" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <span>
          <b style={{ color: "var(--paper)" }}>Overdue email reminders</b> — writers with overdue items get emailed
          daily at 08:00 UTC; you get a full summary. Pause a specific person below (e.g. while they're out sick).
        </span>
        <button className="mini-btn" onClick={runCheckNow} disabled={checking}>
          {checking ? "running…" : "send reminder check now"}
        </button>
      </div>

      {checkResult && (
        <p style={{ marginTop: 8 }}>
          {checkResult.error
            ? `Error: ${checkResult.error}`
            : `Emailed ${checkResult.emailedPeople?.length || 0} writer(s), ${checkResult.totalOverdue} overdue item(s) total${
                checkResult.skippedPaused?.length ? `, skipped (paused): ${checkResult.skippedPaused.join(", ")}` : ""
              }.`}
        </p>
      )}

      {!loading && (
        <>
          <form onSubmit={addPause} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "flex-end" }}>
            <div className="field" style={{ minWidth: 140 }}>
              <label>Person</label>
              <select value={form.profileId} onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}>
                <option value="">select…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name || p.email} ({p.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 130 }}>
              <label>From</label>
              <input type="date" value={form.startsOn} onChange={(e) => setForm((f) => ({ ...f, startsOn: e.target.value }))} />
            </div>
            <div className="field" style={{ minWidth: 130 }}>
              <label>Until</label>
              <input type="date" value={form.endsOn} onChange={(e) => setForm((f) => ({ ...f, endsOn: e.target.value }))} />
            </div>
            <div className="field" style={{ minWidth: 160 }}>
              <label>Note (optional)</label>
              <input type="text" placeholder="e.g. sick leave" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button className="mini-btn" type="submit">
              add pause
            </button>
          </form>

          {pauses.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {pauses.map((p) => (
                <div key={p.id} className="file-item">
                  <span className="fname">
                    {p.profiles?.display_name || p.profiles?.email} · {fmtDate(p.starts_on)} → {fmtDate(p.ends_on)}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                  <button onClick={() => removePause(p.id)}>remove</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ManagerDashboard({ items }) {
  const people = derivePeople(items);
  const totalContentDone = items.filter((i) => i.contentStatus === "Ready for Upload").length;
  const totalLive = items.filter((i) => i.uploadStatus === "Live").length;
  const totalIssues = items.filter((i) => i.uploadStatus === "Issues").length;

  const sectionTitle = {
    fontFamily: "'Fraunces',serif",
    fontWeight: 600,
    fontSize: "15px",
    margin: "4px 0 10px",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: ".05em",
  };

  return (
    <>
      <h3 style={sectionTitle}>Content team — by writer</h3>
      <section className="dash">
        {people.map((p) => {
          const personItems = items.filter((i) => i.person === p);
          const done = personItems.filter((i) => i.contentStatus === "Ready for Upload").length;
          const pct = personItems.length ? Math.round((done / personItems.length) * 100) : 0;
          return (
            <div className="dash-card" key={p}>
              <div className="who">
                <span>{p}</span>
                <span>
                  {done}/{personItems.length}
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%`, background: "var(--sage)" }} />
              </div>
              <div className="meta">
                <span>{pct}% ready</span>
                <span>{nextDeadlineFor(items, p)}</span>
              </div>
            </div>
          );
        })}
      </section>

      <h3 style={{ ...sectionTitle, marginTop: "20px" }}>Upload team — publishing pipeline</h3>
      <section className="dash">
        {[
          { label: "Queued", color: "var(--muted)" },
          { label: "Uploading", color: "var(--blue)" },
          { label: "Issues", color: "var(--rust)" },
          { label: "Live", color: "var(--sage)" },
        ].map((s) => (
          <div className="dash-card" key={s.label}>
            <div className="who">
              <span>{s.label}</span>
              <span>{items.filter((i) => i.uploadStatus === s.label).length}</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: "100%", background: s.color }} />
            </div>
          </div>
        ))}
      </section>

      <div className="bonus">
        <div className="b-title">
          Overall pipeline
          <small>
            {totalLive} of {items.length} pieces are live on the site.
          </small>
        </div>
        <div className="b-stat">
          <div className="n">{totalContentDone}</div>
          <div className="l">Handed to upload</div>
        </div>
        <div className="b-stat">
          <div className="n">{totalLive}</div>
          <div className="l">Live</div>
        </div>
        <div className="b-stat">
          <div className="n" style={{ color: totalIssues ? "var(--rust)" : "var(--sage)" }}>
            {totalIssues}
          </div>
          <div className="l">Blocked</div>
        </div>
      </div>

      <h3 style={{ ...sectionTitle, marginTop: "20px" }}>Notifications</h3>
      <NotificationPauses />
    </>
  );
}
