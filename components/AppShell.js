"use client";
import { useEffect, useState } from "react";
import Nav from "./Nav";
import ContentBoard from "./ContentBoard";
import UploadBoard from "./UploadBoard";
import ManagerDashboard from "./ManagerDashboard";
import TopicMap from "./TopicMap";
import BonusArcade from "./BonusArcade";
import CardModal from "./CardModal";
import { fetchItems, patchItem, getDataProvenance } from "../lib/data";

export default function AppShell() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [view, setView] = useState("content");
  const [openCardId, setOpenCardId] = useState(null);

  useEffect(() => {
    fetchItems()
      .then(setItems)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const openItem = items.find((i) => i.id === openCardId) || null;
  const provenance = getDataProvenance();

  async function moveItem(id, newStatus, field) {
    // field is "contentStatus" on the content board, "uploadStatus" on the upload board
    const current = items.find((it) => it.id === id);
    if (!current) return;
    const patch = { [field]: newStatus };
    if (field === "contentStatus" && newStatus === "Ready for Upload" && !current.uploadStatus) {
      patch.uploadStatus = "Queued";
    }
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    try {
      await patchItem(id, patch);
    } catch (err) {
      setItems((prev) => prev.map((it) => (it.id === id ? current : it))); // revert on failure
    }
  }

  async function saveCard(next) {
    const prevItems = items;
    setItems((prev) => prev.map((it) => (it.id === next.id ? { ...it, ...next } : it)));
    try {
      await patchItem(next.id, next);
    } catch (err) {
      setItems(prevItems); // revert on failure
      throw err;
    }
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

      {loading && <p className="note">Loading items…</p>}
      {loadError && <p className="note" style={{ color: "var(--rust)" }}>Couldn&apos;t load items: {loadError}</p>}

      {!loading && !loadError && (
        <>
          {view === "content" && (
            <ContentBoard
              items={items}
              onOpenCard={setOpenCardId}
              onMove={(id, status) => moveItem(id, status, "contentStatus")}
            />
          )}
          {view === "upload" && (
            <UploadBoard
              items={items}
              onOpenCard={setOpenCardId}
              onMove={(id, status) => moveItem(id, status, "uploadStatus")}
            />
          )}
          {view === "manager" && <ManagerDashboard items={items} />}
          {view === "map" && <TopicMap />}
          {view === "bonus" && <BonusArcade />}
        </>
      )}

      {openItem && <CardModal item={openItem} onClose={() => setOpenCardId(null)} onSave={saveCard} />}
    </div>
  );
}
