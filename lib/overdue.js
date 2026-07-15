import { daysUntil } from "./format";

// Groups overdue content items by writer, and upload-blocked items
// separately (no per-item uploader assignment exists yet, so those go to
// whoever has the "upload" role).
export function computeOverdueReport(items) {
  const overdueContent = items.filter((i) => i.contentStatus !== "Ready for Upload" && daysUntil(i.deadline) < 0);
  const byPerson = {};
  for (const item of overdueContent) {
    const person = item.person || "Unassigned";
    if (!byPerson[person]) byPerson[person] = [];
    byPerson[person].push(item);
  }

  const uploadIssues = items.filter((i) => i.uploadStatus === "Issues");

  return { byPerson, uploadIssues, totalOverdue: overdueContent.length };
}

export function isPaused(pauses, profileId, today = new Date()) {
  const todayStr = today.toISOString().slice(0, 10);
  return pauses.some((p) => p.profile_id === profileId && p.starts_on <= todayStr && todayStr <= p.ends_on);
}
