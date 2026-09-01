// Maps between the Postgres row shape (snake_case, files as a joined table)
// and the app's item shape (camelCase, files as an inline array) — the
// shape components already expect, unchanged since the mock-data days.

export function rowToItem(row) {
  return {
    id: row.id,
    person: row.person,
    type: row.type,
    topic: row.topic,
    keywords: row.keywords,
    topicTreeLink: row.topic_tree_link,
    pageLink: row.page_link,
    importance: row.importance,
    deadline: row.deadline,
    contentStatus: row.content_status,
    uploadStatus: row.upload_status,
    uploadIssues: row.upload_issues,
    uploader: row.uploader,
    mediaStatus: row.media_status,
    mobile: row.mobile,
    translated: row.translated,
    indexed: row.indexed,
    files: (row.item_files || [])
      .filter((f) => (f.category || "document") === "document")
      .map((f) => ({ id: f.id, name: f.name, size: f.size_label, addedAt: f.added_at, url: f.web_view_link })),
    mediaFiles: (row.item_files || [])
      .filter((f) => f.category === "media")
      .map((f) => ({ id: f.id, name: f.name, size: f.size_label, addedAt: f.added_at, url: f.web_view_link })),
  };
}

// Whitelist of item fields a PATCH is allowed to touch, mapped to their
// column names. Anything else in the request body is ignored.
export const PATCHABLE_FIELDS = {
  person: "person",
  type: "type",
  topic: "topic",
  keywords: "keywords",
  topicTreeLink: "topic_tree_link",
  pageLink: "page_link",
  importance: "importance",
  deadline: "deadline",
  contentStatus: "content_status",
  uploadStatus: "upload_status",
  uploadIssues: "upload_issues",
  uploader: "uploader",
  mediaStatus: "media_status",
  mobile: "mobile",
  translated: "translated",
  indexed: "indexed",
};

export function itemPatchToRow(patch) {
  const row = {};
  for (const [key, column] of Object.entries(PATCHABLE_FIELDS)) {
    if (key in patch) row[column] = patch[key];
  }
  return row;
}

// Which item fields each role is allowed to write — mirrors the board
// split (content team owns the content-side fields, upload team owns the
// upload-side fields, media team owns the media-side fields). Manager can
// touch everything. A person can hold more than one role (e.g. Zoe: media
// + upload), so this takes the full role list and unions what each grants.
export const CONTENT_FIELDS = ["person", "type", "topic", "keywords", "topicTreeLink", "pageLink", "importance", "deadline", "contentStatus"];
export const UPLOAD_FIELDS = ["uploadStatus", "uploadIssues", "uploader", "mobile", "translated", "indexed"];
export const MEDIA_FIELDS = ["mediaStatus"];

const FIELDS_BY_ROLE = { content: CONTENT_FIELDS, upload: UPLOAD_FIELDS, media: MEDIA_FIELDS };

export function fieldsAllowedForRoles(roles) {
  const list = (Array.isArray(roles) ? roles : [roles]).filter(Boolean);
  if (list.includes("manager")) return Object.keys(PATCHABLE_FIELDS);
  const allowed = new Set();
  for (const role of list) {
    for (const field of FIELDS_BY_ROLE[role] || []) allowed.add(field);
  }
  return [...allowed];
}

export const MEDIA_STATUSES = ["Ready to add media", "Media created", "Media approved", "Ready for upload"];

// Cross-team handoff side effects that have to happen server-side (a
// single-team request isn't allowed to set another team's field
// directly). `current` is the row's pre-patch state; `row` is the
// column-named patch about to be applied — mutated in place.
export function applyHandoffs(row, current) {
  // Content -> Upload: handing off queues it for the upload team.
  if (row.content_status === "Ready for Upload" && current && !current.upload_status) {
    row.upload_status = "Queued";
  }

  // Upload -> Media: going live for the first time opens the media task.
  // Guarded on current.upload_status !== "Live" so this only fires on a
  // genuine transition into Live, not every time a form that happens to
  // include uploadStatus: "Live" gets saved (the card modal always
  // resends the full form, so an already-Live item would otherwise
  // re-enter this on any unrelated edit).
  if (row.upload_status === "Live" && current && current.upload_status !== "Live" && current.media_status == null) {
    row.media_status = "Ready to add media";
  }

  // Media -> Upload: media team finished, hand back for re-publish. Same
  // reasoning — only on the actual transition into "Ready for upload".
  if (row.media_status === "Ready for upload" && current && current.media_status !== "Ready for upload") {
    row.upload_status = "Queued";
  }

  // Upload -> done: re-publishing after a media round closes the cycle so
  // the item doesn't loop back into the media board again.
  if (row.upload_status === "Live" && current && current.upload_status !== "Live" && current.media_status === "Ready for upload") {
    row.media_status = "Done";
  }
}
