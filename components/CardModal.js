"use client";
import { useEffect, useState } from "react";
import { copyText } from "../lib/format";
import { CONTENT_STATUSES, MEDIA_STATUSES } from "../lib/data";
import SeoBrief from "./SeoBrief";

export default function CardModal({ item, onClose, onSave, profile, roles, boardView }) {
  const [form, setForm] = useState({ ...item });
  const [saveMsg, setSaveMsg] = useState("");
  const [copiedField, setCopiedField] = useState(null);
  const [assignMsg, setAssignMsg] = useState("");
  const [writers, setWriters] = useState([]);

  const myRoles = roles || [];
  const isManager = myRoles.includes("manager");

  // Managers assign cards to people from the content team.
  useEffect(() => {
    if (!isManager) return;
    fetch("/api/profiles")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) =>
        setWriters(
          list
            .filter((p) => p.display_name && (p.roles?.length ? p.roles : [p.role]).some((r) => r === "content" || r === "manager"))
            .map((p) => p.display_name)
        )
      )
      .catch(() => {});
  }, [isManager]);

  if (!item) return null;
  const canEditMedia = isManager || myRoles.includes("media");
  // Which view to render is about which board the card was opened from, not
  // a fixed role — someone with content + media sees the simplified media
  // view from the Media board and the full view from the Content board.
  const isMediaViewer = boardView === "media";
  const showPageLink = form.type !== "Glossar";
  const fullyDone = form.contentStatus === "Online" && form.mediaStatus === "Medien online";
  const mediaInProgress = form.contentStatus === "Online" && form.mediaStatus && form.mediaStatus !== "Medien online";

  function patch(fields) {
    setForm((f) => ({ ...f, ...fields }));
  }

  async function handleCopy(field, value) {
    await copyText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1200);
  }

  async function handleSave() {
    setSaveMsg("wird gespeichert…");
    try {
      await onSave(form);
      setSaveMsg("gespeichert ✓");
    } catch {
      setSaveMsg("Speichern fehlgeschlagen – bitte erneut versuchen");
    }
  }

  // Claiming saves immediately rather than waiting for "Speichern" — the
  // whole point is avoiding two people grabbing the same card.
  async function setMediaPerson(name) {
    setAssignMsg("wird gespeichert…");
    const next = { ...form, mediaPerson: name };
    setForm(next);
    try {
      await onSave(next);
      setAssignMsg("");
    } catch {
      setAssignMsg("konnte nicht gespeichert werden – bitte erneut versuchen");
    }
  }

  function claimRow() {
    const me = profile?.display_name;
    const assignedToMe = form.mediaPerson && me && form.mediaPerson === me;
    return (
      <div className="claim-row">
        <span className="hint">{form.mediaPerson ? `In Bearbeitung von: ${form.mediaPerson}` : "Noch niemand zugewiesen"}</span>
        {canEditMedia && !form.mediaPerson && me && (
          <button className="mini-btn" onClick={() => setMediaPerson(me)}>
            mir zuweisen
          </button>
        )}
        {canEditMedia && assignedToMe && (
          <button className="mini-btn" onClick={() => setMediaPerson(null)}>
            Zuweisung aufheben
          </button>
        )}
        {canEditMedia && form.mediaPerson && !assignedToMe && isManager && (
          <button className="mini-btn" onClick={() => setMediaPerson(me)}>
            mir zuweisen
          </button>
        )}
        {assignMsg && <span className="hint">{assignMsg}</span>}
      </div>
    );
  }

  function mediaStatusSelect() {
    return (
      <select value={form.mediaStatus || ""} onChange={(e) => patch({ mediaStatus: e.target.value })} disabled={!canEditMedia}>
        {MEDIA_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    );
  }

  function pageLinkRow() {
    return (
      <div className="info-row">
        <span className="il">Seiten-URL</span>
        <span className="iv">
          {form.pageLink ? (
            <a href={form.pageLink} target="_blank" rel="noreferrer">
              {form.pageLink.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          ) : (
            "—"
          )}
        </span>
        <button className="copy-btn" onClick={() => handleCopy("url", form.pageLink)}>
          {copiedField === "url" ? "kopiert ✓" : "kopieren"}
        </button>
      </div>
    );
  }

  // ── Media team gets a deliberately stripped-down view: the page link
  // (skipped for glossary entries, which don't have a clean one), who's on
  // it, and their status — nothing else. ──────────────────────────────────
  if (isMediaViewer) {
    return (
      <div className="overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>{form.topic}</h2>
            <button className="close-x" onClick={onClose} aria-label="Schließen">
              ✕
            </button>
          </div>
          <div className="sub">{form.type}</div>

          {showPageLink && pageLinkRow()}

          <label className="section-label">Wer arbeitet daran</label>
          {claimRow()}

          <div className="field-row">
            <div className="field">
              <label>Medien-Status</label>
              {mediaStatusSelect()}
            </div>
          </div>

          <button className="save-note-btn" onClick={handleSave}>
            Änderungen speichern
          </button>
          <div className="status-msg">{saveMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{form.topic}</h2>
          <button className="close-x" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        <div className="sub">
          {form.type}
          {form.month ? ` · ${form.round === 2 ? "Runde 2 (später)" : `Monat ${form.month}`}` : ""} ·{" "}
          {form.person ? `zugewiesen an ${form.person}` : "noch niemand zugewiesen"}
        </div>

        {fullyDone && <div className="done-badge" style={{ marginBottom: 12 }}>✅ Text + Medien online – komplett erledigt</div>}
        {mediaInProgress && (
          <div className="progress-badge" style={{ marginBottom: 12 }}>
            🎨 Online, Media-Team arbeitet noch an den Bildern ({form.mediaStatus})
          </div>
        )}

        <div className="info-row">
          <span className="il">Cluster</span>
          <span className="iv">{form.topicTreeLink || form.cluster || "—"}</span>
        </div>
        {pageLinkRow()}

        <div className="field-row">
          <div className="field">
            <label>Content-Status</label>
            <select value={form.contentStatus} onChange={(e) => patch({ contentStatus: e.target.value })}>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Deadline</label>
            <input type="date" value={form.deadline || ""} onChange={(e) => patch({ deadline: e.target.value || null })} />
          </div>
          {isManager && (
            <div className="field">
              <label>Zugewiesen an</label>
              <select value={form.person || ""} onChange={(e) => patch({ person: e.target.value || null })}>
                <option value="">– niemand –</option>
                {[...new Set([...writers, form.person].filter(Boolean))].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <SeoBrief item={form} />

        {form.contentStatus === "Online" ? (
          <>
            <label className="section-label">Nach der Veröffentlichung</label>
            <div className="checks">
              <label>
                <input type="checkbox" checked={!!form.mobile} onChange={(e) => patch({ mobile: e.target.checked })} />
                Mobil optimiert
              </label>
              <label>
                <input type="checkbox" checked={!!form.indexed} onChange={(e) => patch({ indexed: e.target.checked })} />
                Indexiert
              </label>
            </div>
          </>
        ) : (
          <div className="info-box">
            Die Checks nach der Veröffentlichung erscheinen, sobald die Karte auf <b>Online</b> steht.
          </div>
        )}

        {form.mediaStatus && (
          <>
            <label className="section-label">Media-Team</label>
            {claimRow()}
            <div className="field-row">
              <div className="field">{mediaStatusSelect()}</div>
            </div>
          </>
        )}

        <button className="save-note-btn" onClick={handleSave}>
          Änderungen speichern
        </button>
        <div className="status-msg">{saveMsg}</div>
      </div>
    </div>
  );
}
