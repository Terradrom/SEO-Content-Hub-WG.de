// Maps between the Postgres row shape (snake_case) and the app's item
// shape (camelCase) — the shape components expect.

export const CONTENT_STATUSES = ["Nicht begonnen", "In Arbeit", "Online"];
export const MEDIA_STATUSES = ["Bereit für Medien", "Medien erstellt", "Medien freigegeben", "Medien online"];

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
    mediaStatus: row.media_status,
    mediaPerson: row.media_person,
    mobile: row.mobile,
    indexed: row.indexed,
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
  mediaStatus: "media_status",
  mediaPerson: "media_person",
  mobile: "mobile",
  indexed: "indexed",
};

export function itemPatchToRow(patch) {
  const row = {};
  for (const [key, column] of Object.entries(PATCHABLE_FIELDS)) {
    if (key in patch) row[column] = patch[key];
  }
  return row;
}

// Which item fields each role is allowed to write. The content team writes
// and publishes the text (incl. the mobile/indexed checks), the media team
// owns the media stage. Manager can touch everything. A person can hold
// more than one role, so this unions what each role grants.
export const CONTENT_FIELDS = [
  "person", "type", "topic", "keywords", "topicTreeLink", "pageLink", "importance", "deadline", "contentStatus", "mobile", "indexed",
];
export const MEDIA_FIELDS = ["mediaStatus", "mediaPerson"];

const FIELDS_BY_ROLE = { content: CONTENT_FIELDS, media: MEDIA_FIELDS };

export function fieldsAllowedForRoles(roles) {
  const list = (Array.isArray(roles) ? roles : [roles]).filter(Boolean);
  if (list.includes("manager")) return Object.keys(PATCHABLE_FIELDS);
  const allowed = new Set();
  for (const role of list) {
    for (const field of FIELDS_BY_ROLE[role] || []) allowed.add(field);
  }
  return [...allowed];
}

// Cross-team handoff that has to happen server-side (the content team
// isn't allowed to set the media field directly). `current` is the row's
// pre-patch state; `row` is the column-named patch about to be applied —
// mutated in place.
export function applyHandoffs(row, current) {
  // Content -> Media: the text going online for the first time opens the
  // media task. Guarded on the real transition so re-saving an already
  // online card doesn't reopen a finished media round.
  if (row.content_status === "Online" && current && current.content_status !== "Online" && current.media_status == null) {
    row.media_status = "Bereit für Medien";
  }
}
