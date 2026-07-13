// NOTE: "today" is pinned so the demo data (seeded with July 2026 deadlines)
// reads sensibly. Swap this for `new Date()` once real dates are in play.
const DEMO_TODAY = new Date("2026-07-11T00:00:00");

export function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d - DEMO_TODAY) / 86400000);
}

export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}
