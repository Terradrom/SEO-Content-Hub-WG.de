"use client";
import { useState } from "react";
import Nav from "./Nav";
import ContentBoard from "./ContentBoard";
import UploadBoard from "./UploadBoard";
import ManagerDashboard from "./ManagerDashboard";
import TopicMap from "./TopicMap";
import BonusArcade from "./BonusArcade";
import CardModal from "./CardModal";
import { getSeedItems, getDataProvenance } from "../lib/data";

export default function AppShell() {
  const [items, setItems] = useState(() => getSeedItems());
  const [view, setView] = useState("content");
  const [openCardId, setOpenCardId] = useState(null);

  const openItem = items.find((i) => i.id === openCardId) || null;
  const provenance = getDataProvenance();

  function moveItem(id, newStatus, field) {
    // field is "contentStatus" on the content board, "uploadStatus" on the upload board
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const patch = { [field]: newStatus };
        if (field === "contentStatus" && newStatus === "Ready for Upload" && !it.uploadStatus) {
          patch.uploadStatus = "Queued";
        }
        return { ...it, ...patch };
      })
    );
  }

  function saveCard(next) {
    // TODO(backend): swap this for a PATCH to your API / database.
    return new Promise((resolve) => {
      setItems((prev) => prev.map((it) => (it.id === next.id ? { ...it, ...next } : it)));
      setTimeout(resolve, 150); // tiny delay so the "saving…" state is visible
    });
  }

  return (
    <div className="wrap">
      <header className="masthead">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>Content Hub</h1>
            <span className="stamp-mini">Live board</span>
          </div>
          <p>Content team drafts &amp; uploads → Data Entry team publishes &amp; QAs. Two queues, one source of truth.</p>
        </div>
        {provenance && (
          <div className="hint" title="Regenerate via scripts/import_from_xlsx.py">
            data as of {provenance.importedAt?.slice(0, 10)} · {provenance.sourceFile} · {provenance.itemCount} items
          </div>
        )}
      </header>

      <Nav view={view} setView={setView} />

      {view === "content" && (
        <ContentBoard items={items} onOpenCard={setOpenCardId} onMove={(id, status) => moveItem(id, status, "contentStatus")} />
      )}
      {view === "upload" && (
        <UploadBoard items={items} onOpenCard={setOpenCardId} onMove={(id, status) => moveItem(id, status, "uploadStatus")} />
      )}
      {view === "manager" && <ManagerDashboard items={items} />}
      {view === "map" && <TopicMap />}
      {view === "bonus" && <BonusArcade />}

      {openItem && <CardModal item={openItem} onClose={() => setOpenCardId(null)} onSave={saveCard} />}
    </div>
  );
}
