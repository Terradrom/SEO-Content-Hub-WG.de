"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "./Nav";
import ContentBoard from "./ContentBoard";
import MediaBoard from "./MediaBoard";
import ManagerDashboard from "./ManagerDashboard";
import TopicMap from "./TopicMap";
import BonusArcade from "./BonusArcade";
import CardModal from "./CardModal";
import ScrollToTopButton from "./ScrollToTopButton";
import { fetchItems, patchItem, getDataProvenance, ROLE_LABELS } from "../lib/data";
import { supabaseBrowser } from "../lib/supabase-browser";

const DEFAULT_VIEW_BY_ROLE = { content: "content", media: "media", manager: "content" };

export default function AppShell({ user, profile }) {
  const router = useRouter();
  const role = profile?.role || null;
  const roles = profile?.roles?.length ? profile.roles : role ? [role] : [];
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
    // field is "contentStatus" / "mediaStatus" depending on board
    const current = items.find((it) => it.id === id);
    if (!current) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: newStatus } : it)));
    try {
      // The server may apply the media handoff beyond the single field we
      // sent — use its real response as the new source of truth.
      const updated = await patchItem(id, { [field]: newStatus });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updated } : it)));
    } catch (err) {
      setItems((prev) => prev.map((it) => (it.id === id ? current : it))); // revert on failure
    }
  }

  async function saveCard(next) {
    const prevItems = items;
    setItems((prev) => prev.map((it) => (it.id === next.id ? { ...it, ...next } : it)));
    try {
      const updated = await patchItem(next.id, next);
      setItems((prev) => prev.map((it) => (it.id === next.id ? { ...it, ...updated } : it)));
    } catch (err) {
      setItems(prevItems); // revert on failure
      throw err;
    }
  }

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="masthead-title">
          <img className="brand-logo" src="/logo.png" alt="Werbegeschenk.de" />
          <div>
            <h1>SEO Content Hub</h1>
            <p>Content-Team schreibt &amp; veröffentlicht → Media-Team ergänzt die Bilder. Eine Quelle für alles.</p>
          </div>
        </div>
        <div className="masthead-meta">
          {provenance?.itemCount > 0 && (
            <div className="hint" title="Neu erzeugen über scripts/import_from_xlsx.mjs">
              Daten vom {provenance.importedAt?.slice(0, 10)} · {provenance.sourceFile} · {provenance.itemCount} Aufgaben
            </div>
          )}
          <div className="account-bar">
            <span className="hint">
              {user?.email}{" "}
              {roles.length
                ? `· ${roles.map((r) => ROLE_LABELS[r] || r).join(" + ")}`
                : "· noch keine Rolle zugewiesen – bitte beim Manager melden"}
            </span>
            <button className="signout-btn" onClick={signOut}>
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <Nav view={view} setView={setView} roles={roles} />

      {loading && <p className="note">Aufgaben werden geladen…</p>}
      {loadError && <p className="note" style={{ color: "var(--danger)" }}>Aufgaben konnten nicht geladen werden: {loadError}</p>}

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
          {view === "media" && (
            <MediaBoard
              items={items}
              onOpenCard={setOpenCardId}
              onMove={(id, status) => moveItem(id, status, "mediaStatus")}
            />
          )}
          {view === "manager" && <ManagerDashboard items={items} />}
          {view === "map" && <TopicMap />}
          {view === "bonus" && <BonusArcade items={items} />}
        </>
      )}

      {openItem && (
        <CardModal
          item={openItem}
          onClose={() => setOpenCardId(null)}
          onSave={saveCard}
          profile={profile}
          roles={roles}
          boardView={view}
        />
      )}
      <ScrollToTopButton />
    </div>
  );
}
