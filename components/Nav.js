"use client";

const TABS = [
  { id: "content", label: "Content Team", roles: ["content", "manager"] },
  { id: "upload", label: "Upload Team", roles: ["upload", "manager"] },
  { id: "media", label: "Media Team", roles: ["media", "manager"] },
  { id: "manager", label: "Manager", roles: ["manager"] },
  { id: "map", label: "Topic Map", roles: ["content", "upload", "media", "manager"] },
  { id: "bonus", label: "Bonus Arcade", roles: ["content", "upload", "media", "manager"] },
];

export default function Nav({ view, setView, role }) {
  const tabs = TABS.filter((t) => t.roles.includes(role));
  return (
    <nav className="nav">
      {tabs.map((t) => (
        <button key={t.id} className={view === t.id ? "active" : ""} onClick={() => setView(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
