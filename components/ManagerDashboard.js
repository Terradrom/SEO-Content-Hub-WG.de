"use client";
import { derivePeople } from "../lib/data";
import { daysUntil } from "../lib/format";

function nextDeadlineFor(items, person) {
  const upcoming = items
    .filter((i) => i.person === person && i.contentStatus !== "Ready for Upload")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  if (!upcoming) return "all clear";
  const d = daysUntil(upcoming.deadline);
  return d < 0 ? `${Math.abs(d)}d overdue` : `due in ${d}d`;
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
    </>
  );
}
