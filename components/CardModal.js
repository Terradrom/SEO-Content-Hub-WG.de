"use client";
import { useRef, useState } from "react";
import { copyText } from "../lib/format";
import { CONTENT_STATUSES, UPLOAD_STATUSES } from "../lib/data";

export default function CardModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({ ...item });
  const [dragging, setDragging] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [copiedField, setCopiedField] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  if (!item) return null;

  function patch(fields) {
    setForm((f) => ({ ...f, ...fields }));
  }

  async function addFile(file) {
    setFileError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/items/${item.id}/files`, { method: "POST", body });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "upload failed");
      }
      const uploaded = await res.json();
      patch({ files: [...form.files, uploaded] });
    } catch (err) {
      setFileError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(idx) {
    const target = form.files[idx];
    patch({ files: form.files.filter((_, i) => i !== idx) });
    if (target?.id) {
      await fetch(`/api/items/${item.id}/files/${target.id}`, { method: "DELETE" }).catch(() => {});
    }
  }

  async function handleCopy(field, value) {
    const ok = await copyText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1200);
  }

  async function handleSave() {
    setSaveMsg("saving…");
    const next = { ...form };
    if (next.contentStatus === "Ready for Upload" && !next.uploadStatus) next.uploadStatus = "Queued";
    await onSave(next);
    setSaveMsg("saved ✓");
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{form.topic}</h2>
          <button className="close-x" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sub">
          {form.type} · assigned to {form.person}
        </div>

        <div className="info-row">
          <span className="il">Topic tree</span>
          <span className="iv">{form.topicTreeLink || "—"}</span>
          <button className="copy-btn" onClick={() => handleCopy("tree", form.topicTreeLink)}>
            {copiedField === "tree" ? "copied ✓" : "copy"}
          </button>
        </div>
        <div className="info-row">
          <span className="il">Page URL</span>
          <span className="iv">{form.pageLink || "—"}</span>
          <button className="copy-btn" onClick={() => handleCopy("url", form.pageLink)}>
            {copiedField === "url" ? "copied ✓" : "copy"}
          </button>
        </div>
        <div className="kw-box">
          <b style={{ color: "var(--paper)", fontFamily: "Inter" }}>Keywords</b>
          <br />
          {form.keywords || "—"}
        </div>

        <div className="field-row">
          <div className="field">
            <label>Content status</label>
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
            <input type="date" value={form.deadline} onChange={(e) => patch({ deadline: e.target.value })} />
          </div>
        </div>

        {form.contentStatus === "Ready for Upload" ? (
          <>
            <div className="field-row">
              <div className="field">
                <label>Upload status</label>
                <select value={form.uploadStatus || "Queued"} onChange={(e) => patch({ uploadStatus: e.target.value })}>
                  {UPLOAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="checks">
              <label>
                <input type="checkbox" checked={!!form.mobile} onChange={(e) => patch({ mobile: e.target.checked })} />
                Mobile optimised
              </label>
              <label>
                <input type="checkbox" checked={!!form.translated} onChange={(e) => patch({ translated: e.target.checked })} />
                Translated
              </label>
              <label>
                <input type="checkbox" checked={!!form.indexed} onChange={(e) => patch({ indexed: e.target.checked })} />
                Indexed
              </label>
            </div>
            <label className="section-label">Upload issue (blocks &quot;Live&quot; until cleared)</label>
            <textarea
              value={form.uploadIssues || ""}
              placeholder="e.g. missing product image, keyword conflict..."
              onChange={(e) => patch({ uploadIssues: e.target.value })}
            />
          </>
        ) : (
          <div className="upload-gate">
            Upload-team fields unlock once this card is moved to <b>Ready for Upload</b>.
          </div>
        )}

        <label className="section-label">Document</label>
        <div
          className={`dropzone ${dragging ? "drag" : ""}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length && !uploading) addFile(e.dataTransfer.files[0]);
          }}
        >
          {uploading ? (
            <strong>Uploading to Drive…</strong>
          ) : (
            <>
              <strong>Drop a file here</strong> or click to attach
              <br />
              pushes straight into the shared Drive folder
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => e.target.files.length && addFile(e.target.files[0])}
          />
        </div>
        {fileError && <div style={{ color: "var(--rust)" }}>{fileError}</div>}
        <div className="file-list">
          {form.files.map((f, idx) => (
            <div className="file-item" key={f.id || idx}>
              <span className="fname">
                📄{" "}
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer">
                    {f.name}
                  </a>
                ) : (
                  f.name
                )}{" "}
                <span style={{ color: "var(--muted)" }}>· {f.size}</span>
              </span>
              <button onClick={() => removeFile(idx)}>remove</button>
            </div>
          ))}
        </div>

        <button className="save-note-btn" onClick={handleSave}>
          Save changes
        </button>
        <div className="status-msg">{saveMsg}</div>
      </div>
    </div>
  );
}
