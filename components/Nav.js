"use client";

const TABS = [
  { id: "content", label: "Content Team" },
  { id: "upload", label: "Upload Team" },
  { id: "manager", label: "Manager" },
  { id: "map", label: "Topic Map" },
  { id: "bonus", label: "Bonus Arcade" },
];

export default function Nav({ view, setView }) {
  return (
    <nav className="nav">
      {TABS.map((t) => (
        <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
