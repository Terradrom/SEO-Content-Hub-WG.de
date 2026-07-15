import { Resend } from "resend";
import { fmtDate, daysUntil } from "./format.js";

function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "Content Hub 🌿 <reminders@terradrom.com>";

const NUDGES = [
  "just a friendly nudge from your favorite content board! 🐾",
  "no stress, just a gentle poke from the hub! ✨",
  "popping in with a tiny reminder, no big deal! 🌱",
  "your board misses you a little bit! 💌",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Same cat all week, a new one next week — also works around email
// clients (Gmail, Outlook) proxying and caching images by URL, which
// would otherwise show everyone the same cat forever even though
// cataas.com itself picks a random one per request.
function weeklyCatGif() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `https://cataas.com/cat/gif?week=${now.getFullYear()}-${week}`;
}

function itemRow(i) {
  const overdue = Math.abs(daysUntil(i.deadline));
  return `
    <tr>
      <td class="item-row" style="padding:10px 14px;border-bottom:1px solid #e7ece9;">
        <div class="email-text" style="font-weight:600;color:#0f1e19;font-size:14px;">${i.topic}</div>
        <div class="email-muted" style="font-size:12px;color:#6b8079;margin-top:2px;">${i.type} · was due ${fmtDate(i.deadline)} · ${overdue}d overdue</div>
      </td>
    </tr>`;
}

function shell({ heading, intro, bodyHtml, footer }) {
  const catGif = weeklyCatGif();
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  body { margin:0; padding:0; }
  .email-bg { background:#f4f7f5; }
  .email-card { background:#ffffff; }
  .email-text { color:#0f1e19 !important; }
  .email-muted { color:#6b8079 !important; }
  .email-footer-bg { background:#eef5f1; }
  .item-table { border:1px solid #e7ece9; }
  @media (prefers-color-scheme: dark) {
    .email-bg { background:#05070a !important; }
    .email-card { background:#0f1e19 !important; box-shadow:none !important; }
    .email-text { color:#E3E8EA !important; }
    .email-muted { color:#84a49a !important; }
    .email-footer-bg { background:#0a1512 !important; }
    .item-table { border-color:#1c332c !important; }
    .item-row { border-bottom-color:#1c332c !important; }
  }
</style>
</head>
<body class="email-bg">
  <div class="email-bg" style="padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div class="email-card" style="max-width:520px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#00E08A 0%,#00B377 45%,#027A5F 100%);padding:26px 28px;">
        <div style="font-size:20px;font-weight:700;color:#ffffff;">🌿 Content Hub</div>
        <div style="font-size:13px;color:#ffffff;opacity:.9;margin-top:2px;">${heading}</div>
      </div>
      <div style="padding:26px 28px;">
        <p class="email-text" style="font-size:15px;color:#0f1e19;line-height:1.5;">${intro}</p>
        ${bodyHtml}
        <div style="text-align:center;margin:22px 0 6px;">
          <img src="${catGif}" width="220" alt="a supportive cat" style="border-radius:14px;max-width:100%;" />
        </div>
        <p class="email-muted" style="font-size:12.5px;color:#6b8079;text-align:center;margin-top:6px;">(a cat, for moral support — new one each week)</p>
      </div>
      <div class="email-footer-bg" style="background:#eef5f1;padding:14px 28px;font-size:11.5px;">
        <span class="email-muted" style="color:#6b8079;">${footer}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const SICK_LEAVE_NOTE =
  "If you're sick or on leave, let Miron know so he can turn off your notifications for a bit. 🌴";

export async function sendOverdueEmail(to, name, items) {
  const resend = resendClient();
  const emoji = items.length >= 5 ? "🙀" : "🙂";
  const html = shell({
    heading: "a friendly heads up",
    intro: `Hi <b>${name}</b> ${emoji} — ${pick(NUDGES)}`,
    bodyHtml: `
      <p class="email-text" style="font-size:14px;color:#0f1e19;">You've got <b>${items.length}</b> item${items.length === 1 ? "" : "s"} past its deadline and not yet marked <i>Ready for Upload</i>:</p>
      <table class="item-table" style="width:100%;border-collapse:collapse;margin:14px 0;border-radius:10px;overflow:hidden;">
        ${items.map(itemRow).join("")}
      </table>
      <p class="email-muted" style="font-size:13.5px;color:#4a5f58;">No worries if it's already in progress — just didn't want it to slip through the cracks. 🌱</p>
    `,
    footer: SICK_LEAVE_NOTE,
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `👋 Hey ${name} — ${items.length} item${items.length === 1 ? "" : "s"} could use some love`,
    html,
  });
}

export async function sendManagerSummary(to, byPerson, uploadIssues, managerName) {
  const resend = resendClient();
  const peopleSection = Object.entries(byPerson)
    .map(
      ([person, items]) => `
      <h4 class="email-text" style="font-size:13.5px;color:#0f1e19;margin:16px 0 4px;">👤 ${person} <span class="email-muted" style="color:#6b8079;font-weight:400;">(${items.length} overdue)</span></h4>
      <table class="item-table" style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;">${items.map(itemRow).join("")}</table>`
    )
    .join("");
  const issuesSection = uploadIssues.length
    ? `
      <h4 class="email-text" style="font-size:13.5px;color:#0f1e19;margin:16px 0 4px;">🚧 Upload issues <span class="email-muted" style="color:#6b8079;font-weight:400;">(${uploadIssues.length})</span></h4>
      <table class="item-table" style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;">
        ${uploadIssues.map((i) => `<tr><td class="item-row email-text" style="padding:10px 14px;border-bottom:1px solid #e7ece9;"><b>${i.topic}</b><div class="email-muted" style="font-size:12px;color:#6b8079;">${i.uploadIssues || "no note"}</div></td></tr>`).join("")}
      </table>`
    : "";

  if (!peopleSection && !issuesSection) return; // nothing to report, skip the email entirely

  const html = shell({
    heading: "your daily check-in",
    intro: `Hi <b>${managerName || "there"}</b> 👋 — here's what's cooking on the board today.`,
    bodyHtml: peopleSection + issuesSection,
    footer: "Manage per-person reminder pauses from the Manager tab → Notifications section.",
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: "📋 Content Hub — daily overdue summary",
    html,
  });
}
