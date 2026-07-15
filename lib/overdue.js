import { daysUntil } from "./format";

// Reminders don't start the moment something's late — only once it's been
// overdue for this many days. After that, the daily cron re-sends every
// day until the item moves to "Ready for Upload".
const REMINDER_GRACE_DAYS = 3;

// Groups overdue content items by writer, and upload-blocked items
// separately (no per-item uploader assignment exists yet, so those go to
// whoever has the "upload" role).
export function computeOverdueReport(items) {
  const overdueContent = items.filter(
    (i) => i.contentStatus !== "Ready for Upload" && daysUntil(i.deadline) <= -REMINDER_GRACE_DAYS
  );
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
