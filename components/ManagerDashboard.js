"use client";
import { useEffect, useState } from "react";
import { derivePeople, MEDIA_STATUSES, ROLE_LABELS, PERIODS, inPeriod } from "../lib/data";
import { daysUntil, fmtDate } from "../lib/format";

function nextDeadlineFor(items, person) {
  const upcoming = items
    .filter((i) => i.person === person && i.contentStatus !== "Online" && i.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  if (!upcoming) return "alles erledigt";
  const d = daysUntil(upcoming.deadline);
  return d < 0 ? `${Math.abs(d)} T überfällig` : `fällig in ${d} T`;
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
        setProfiles(Array.isArray(p) ? p : []);
        setPauses(Array.isArray(pz) ? pz : []);
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
    <div className="info-box" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <span>
          <b>E-Mail-Erinnerungen bei Verzug</b> – ist eine Aufgabe 3+ Tage überfällig, bekommt die zuständige Person
          einmal täglich (08:00 UTC) eine E-Mail, bis die Karte auf Online steht. Du bekommst täglich eine
          Zusammenfassung. Unten kannst du einzelne Personen pausieren (z. B. bei Krankheit). Der Button startet eine
          echte Prüfung, keinen Test.
        </span>
        <button className="mini-btn" onClick={runCheckNow} disabled={checking}>
          {checking ? "läuft…" : "Erinnerungen jetzt prüfen"}
        </button>
      </div>

      {checkResult && (
        <p style={{ marginTop: 8 }}>
          {checkResult.error
            ? `Fehler: ${checkResult.error}`
            : `${checkResult.emailedPeople?.length || 0} Person(en) angeschrieben, ${checkResult.totalOverdue} überfällige Aufgabe(n) insgesamt${
                checkResult.skippedPaused?.length ? `, pausiert übersprungen: ${checkResult.skippedPaused.join(", ")}` : ""
              }.`}
        </p>
      )}

      {!loading && (
        <>
          <form onSubmit={addPause} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "flex-end" }}>
            <div className="field" style={{ minWidth: 140 }}>
              <label>Person</label>
              <select value={form.profileId} onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}>
                <option value="">auswählen…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name || p.email} ({(p.roles?.length ? p.roles : [p.role]).map((r) => ROLE_LABELS[r] || r).join(" + ")})
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 130 }}>
              <label>Von</label>
              <input type="date" value={form.startsOn} onChange={(e) => setForm((f) => ({ ...f, startsOn: e.target.value }))} />
            </div>
            <div className="field" style={{ minWidth: 130 }}>
              <label>Bis</label>
              <input type="date" value={form.endsOn} onChange={(e) => setForm((f) => ({ ...f, endsOn: e.target.value }))} />
            </div>
            <div className="field" style={{ minWidth: 160 }}>
              <label>Notiz (optional)</label>
              <input type="text" placeholder="z. B. krank" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <button className="mini-btn" type="submit">
              Pause hinzufügen
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
                  <button onClick={() => removePause(p.id)}>entfernen</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ManagerDashboard({ items, provenance }) {
  const people = derivePeople(items);
  const totalOnline = items.filter((i) => i.contentStatus === "Online").length;
  const totalMediaDone = items.filter((i) => i.mediaStatus === "Medien online").length;
  const totalOverdue = items.filter((i) => i.contentStatus !== "Online" && i.deadline && daysUntil(i.deadline) < 0).length;

  const PLAN_TYPES = ["Kategorie", "Unterkategorie", "Produkt"];

  return (
    <>
      <h3 className="section-title">Cluster-Plan – Fortschritt pro Monat</h3>
      <section className="dash">
        {PERIODS.filter((p) => p.id !== "all").map((p) => {
          const inP = items.filter((i) => inPeriod(i, p.id));
          const online = inP.filter((i) => i.contentStatus === "Online").length;
          const pct = inP.length ? Math.round((online / inP.length) * 100) : 0;
          return (
            <div className="dash-card" key={p.id}>
              <div className="who">
                <span>{p.label.split(" · ")[0]}</span>
                <span>
                  {online}/{inP.length}
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%`, background: p.id === "r2" ? "var(--slate)" : "var(--navy)" }} />
              </div>
              <div className="meta">
                <span>{p.label.split(" · ").slice(1).join(" · ")}</span>
              </div>
              <div className="meta">
                {PLAN_TYPES.map((t) => {
                  const ofType = inP.filter((i) => i.type === t);
                  return ofType.length ? (
                    <span key={t}>
                      {t === "Unterkategorie" ? "Unterkat." : t}: {ofType.filter((i) => i.contentStatus === "Online").length}/{ofType.length}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </section>

      <h3 className="section-title">Content-Team – nach Autor:in</h3>
      <section className="dash">
        {people.length === 0 && (
          <div className="dash-card">
            <div className="meta">Noch niemand zugewiesen – Aufgaben in der Karte unter „Zugewiesen an“ verteilen.</div>
          </div>
        )}
        {people.map((p) => {
          const personItems = items.filter((i) => i.person === p);
          const done = personItems.filter((i) => i.contentStatus === "Online").length;
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
                <div className="bar-fill" style={{ width: `${pct}%`, background: "var(--navy)" }} />
              </div>
              <div className="meta">
                <span>{pct}% online</span>
                <span>{nextDeadlineFor(items, p)}</span>
              </div>
            </div>
          );
        })}
      </section>

      <h3 className="section-title">Media-Team – Pipeline</h3>
      <section className="dash">
        {MEDIA_STATUSES.map((label) => (
          <div className="dash-card" key={label}>
            <div className="who">
              <span>{label}</span>
              <span>{items.filter((it) => it.mediaStatus === label).length}</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: "100%", background: label === "Medien online" ? "var(--success)" : "var(--yellow)" }} />
            </div>
          </div>
        ))}
      </section>

      <div className="bonus">
        <div className="b-title">
          Gesamt-Pipeline
          <small>
            {totalMediaDone} von {items.length} Aufgaben sind komplett fertig (Text + Medien online).
          </small>
        </div>
        <div className="b-stat">
          <div className="n">{totalOnline}</div>
          <div className="l">Text online</div>
        </div>
        <div className="b-stat">
          <div className="n">{totalMediaDone}</div>
          <div className="l">Komplett fertig</div>
        </div>
        <div className="b-stat">
          <div className="n" style={{ color: totalOverdue ? "var(--danger)" : "var(--success)" }}>
            {totalOverdue}
          </div>
          <div className="l">Überfällig</div>
        </div>
      </div>

      <h3 className="section-title">Benachrichtigungen</h3>
      <NotificationPauses />

      {provenance?.itemCount > 0 && (
        <p className="note">
          <b>Datenquelle:</b> {provenance.sourceFile} · importiert am {provenance.importedAt?.slice(0, 10)} ·{" "}
          {provenance.itemCount} Aufgaben. Neu einlesen mit <code>scripts/import_keyword_sheet.mjs</code>.
        </p>
      )}
    </>
  );
}
