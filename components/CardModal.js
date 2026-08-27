"use client";
import { useRef, useState } from "react";
import { copyText } from "../lib/format";
import { CONTENT_STATUSES, UPLOAD_STATUSES, MEDIA_STATUSES } from "../lib/data";
import { supabaseBrowser } from "../lib/supabase-browser";

export default function CardModal({ item, onClose, onSave, profile }) {
  const [form, setForm] = useState({ ...item, files: item.files || [], mediaFiles: item.mediaFiles || [] });
  const [dragging, setDragging] = useState(false);
  const [mediaDragging, setMediaDragging] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [copiedField, setCopiedField] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [mediaFileError, setMediaFileError] = useState("");
  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);

  if (!item) return null;

  const isMediaViewer = profile?.role === "media";
  const showMediaSection = !isMediaViewer && !!form.mediaStatus;
  const showPageLink = form.type !== "Glossaries";

  function patch(fields) {
    setForm((f) => ({ ...f, ...fields }));
  }

  // Three steps so the actual file bytes never pass through our Vercel API
  // route (capped at ~4.5MB there) — sign gets a one-time upload URL,
  // uploadToSignedUrl sends the file straight to Supabase Storage from the
  // browser, confirm records the item_files row once that succeeds.
  async function uploadFile(file, category) {
    const signRes = await fetch(`/api/items/${item.id}/files/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name }),
    });
    if (!signRes.ok) {
      const { error } = await signRes.json().catch(() => ({}));
      throw new Error(error || "couldn't prepare upload");
    }
    const { path, token, publicUrl } = await signRes.json();

    const { error: uploadError } = await supabaseBrowser()
      .storage.from("item-files")
      .uploadToSignedUrl(path, token, file);
    if (uploadError) throw new Error(uploadError.message || "upload failed");

    const confirmRes = await fetch(`/api/items/${item.id}/files/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        path,
        publicUrl,
        size: Math.round(file.size / 1024) + " KB",
        category,
      }),
    });
    if (!confirmRes.ok) {
      const { error } = await confirmRes.json().catch(() => ({}));
      throw new Error(error || "upload saved but couldn't be recorded");
    }
    return confirmRes.json();
  }

  async function addFile(file) {
    setFileError("");
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "document");
      patch({ files: [...form.files, uploaded] });
    } catch (err) {
      setFileError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function addMediaFiles(fileList) {
    setMediaFileError("");
    setMediaUploading(true);
    try {
      const uploadedList = [];
      for (const file of fileList) {
        uploadedList.push(await uploadFile(file, "media"));
      }
      patch({ mediaFiles: [...form.mediaFiles, ...uploadedList] });
    } catch (err) {
      setMediaFileError(err.message);
    } finally {
      setMediaUploading(false);
    }
  }

  async function removeFile(idx) {
    const target = form.files[idx];
    patch({ files: form.files.filter((_, i) => i !== idx) });
    if (target?.id) {
      await fetch(`/api/items/${item.id}/files/${target.id}`, { method: "DELETE" }).catch(() => {});
    }
  }

  async function removeMediaFile(idx) {
    const target = form.mediaFiles[idx];
    patch({ mediaFiles: form.mediaFiles.filter((_, i) => i !== idx) });
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
    await onSave(form);
    setSaveMsg("saved ✓");
  }

  function mediaFilesSection(dropzoneLabel) {
    return (
      <>
        <label className="section-label">Media images</label>
        <div
          className={`dropzone ${mediaDragging ? "drag" : ""}`}
          onClick={() => !mediaUploading && mediaInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setMediaDragging(true);
          }}
          onDragLeave={() => setMediaDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setMediaDragging(false);
            if (e.dataTransfer.files.length && !mediaUploading) addMediaFiles([...e.dataTransfer.files]);
          }}
        >
          {mediaUploading ? (
            <strong>Uploading…</strong>
          ) : (
            <>
              <strong>Drop images here</strong> or click to attach
              <br />
              {dropzoneLabel || "multiple images allowed"}
            </>
          )}
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => e.target.files.length && addMediaFiles([...e.target.files])}
          />
        </div>
        {mediaFileError && <div style={{ color: "var(--rust)" }}>{mediaFileError}</div>}
        <div className="file-list">
          {form.mediaFiles.map((f, idx) => (
            <div className="file-item" key={f.id || idx}>
              <span className="fname">
                🖼️{" "}
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer">
                    {f.name}
                  </a>
                ) : (
                  f.name
                )}{" "}
                <span style={{ color: "var(--muted)" }}>· {f.size}</span>
              </span>
              <button onClick={() => removeMediaFile(idx)}>remove</button>
            </div>
          ))}
        </div>
      </>
    );
  }

  // ── Media team gets a deliberately stripped-down view: the page link
  // (skipped for Glossaries, which don't have a clean one), their status
  // column, and the image upload area — nothing else. ─────────────────────
  if (isMediaViewer) {
    return (
      <div className="overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>{form.topic}</h2>
            <button className="close-x" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="sub">{form.type}</div>

          {showPageLink && (
            <div className="info-row">
              <span className="il">Page URL</span>
              <span className="iv">{form.pageLink || "—"}</span>
              <button className="copy-btn" onClick={() => handleCopy("url", form.pageLink)}>
                {copiedField === "url" ? "copied ✓" : "copy"}
              </button>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>Media status</label>
              <select value={form.mediaStatus || ""} onChange={(e) => patch({ mediaStatus: e.target.value })}>
                {MEDIA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mediaFilesSection()}

          <button className="save-note-btn" onClick={handleSave}>
            Save changes
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <b style={{ color: "var(--paper)", fontFamily: "Inter" }}>Keywords</b>
            <button className="copy-btn" onClick={() => handleCopy("keywords", form.keywords)} style={{ flexShrink: 0 }}>
              {copiedField === "keywords" ? "copied ✓" : "copy all"}
            </button>
          </div>
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

        {showMediaSection && (
          <>
            <label className="section-label">Media team{form.mediaStatus === "Ready for upload" ? " — done, awaiting re-upload" : ""}</label>
            <div className="field-row">
              <div className="field">
                <select value={form.mediaStatus} onChange={(e) => patch({ mediaStatus: e.target.value })} disabled={profile?.role !== "manager"}>
                  {MEDIA_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {profile?.role !== "manager" && form.mediaFiles.length > 0 && (
              <div className="file-list">
                {form.mediaFiles.map((f, idx) => (
                  <div className="file-item" key={f.id || idx}>
                    <span className="fname">
                      🖼️{" "}
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noreferrer">
                          {f.name}
                        </a>
                      ) : (
                        f.name
                      )}{" "}
                      <span style={{ color: "var(--muted)" }}>· {f.size}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
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
            <strong>Uploading…</strong>
          ) : (
            <>
              <strong>Drop a file here</strong> or click to attach
              <br />
              pushes straight into shared storage
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

        {profile?.role === "manager" && mediaFilesSection("manager can also add media images here")}

        <button className="save-note-btn" onClick={handleSave}>
          Save changes
        </button>
        <div className="status-msg">{saveMsg}</div>
      </div>
    </div>
  );
}
