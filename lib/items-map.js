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
    mobile: row.mobile,
    translated: row.translated,
    indexed: row.indexed,
    files: (row.item_files || []).map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size_label,
      addedAt: f.added_at,
      url: f.web_view_link,
    })),
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
