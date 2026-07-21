"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "./Nav";
import ContentBoard from "./ContentBoard";
import UploadBoard from "./UploadBoard";
import ManagerDashboard from "./ManagerDashboard";
import TopicMap from "./TopicMap";
import BonusArcade from "./BonusArcade";
import CardModal from "./CardModal";
import ScrollToTopButton from "./ScrollToTopButton";
import { fetchItems, patchItem, getDataProvenance } from "../lib/data";
import { supabaseBrowser } from "../lib/supabase-browser";

const DEFAULT_VIEW_BY_ROLE = { content: "content", upload: "upload", manager: "content" };

export default function AppShell({ user, profile }) {
  const router = useRouter();
  const role = profile?.role || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [view, setView] = useState(DEFAULT_VIEW_BY_ROLE[role] || "content");
  const [openCardId, setOpenCardId] = useState(null);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
        <div className="masthead-title">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>Content Hub</h1>
            <span className="stamp-mini">Live board</span>
          </div>
          <p>Content team drafts &amp; uploads → Data Entry team publishes &amp; QAs. Two queues, one source of truth.</p>
        </div>
        <div className="masthead-meta">
          {provenance && (
            <div className="hint" title="Regenerate via scripts/import_from_xlsx.py">
              data as of {provenance.importedAt?.slice(0, 10)} · {provenance.sourceFile} · {provenance.itemCount} items
            </div>
          )}
          <div className="account-bar">
            <span className="hint">
              {user?.email} {role ? `· ${role}` : "· no role assigned yet — ask your manager"}
            </span>
            <button className="signout-btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <Nav view={view} setView={setView} role={role} />

      {loading && <p className="note">Loading items…</p>}
      {loadError && <p className="note" style={{ color: "var(--rust)" }}>Couldn&apos;t load items: {loadError}</p>}

      {!loading && !loadError && (
        <>
          {view === "content" && (
            <ContentBoard
              items={items}
              onOpenCard={setOpenCardId}
              onMove={(id, status) => moveItem(id, status, "contentStatus")}
              profile={profile}
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
          {view === "bonus" && <BonusArcade role={role} items={items} />}
        </>
      )}

      {openItem && <CardModal item={openItem} onClose={() => setOpenCardId(null)} onSave={saveCard} />}
      <ScrollToTopButton />
    </div>
  );
}
