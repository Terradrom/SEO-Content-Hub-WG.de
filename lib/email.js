import { Resend } from "resend";
import { fmtDate, daysUntil } from "./format.js";

function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "Content Hub 🌿 <reminders@terradrom.com>";
const CAT_GIF = "https://cataas.com/cat/gif";

const NUDGES = [
  "just a friendly nudge from your favorite content board! 🐾",
  "no stress, just a gentle poke from the hub! ✨",
  "popping in with a tiny reminder, no big deal! 🌱",
  "your board misses you a little bit! 💌",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function itemRow(i) {
  const overdue = Math.abs(daysUntil(i.deadline));
  return `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e7ece9;">
        <div style="font-weight:600;color:#0f1e19;font-size:14px;">${i.topic}</div>
        <div style="font-size:12px;color:#6b8079;margin-top:2px;">${i.type} · was due ${fmtDate(i.deadline)} · ${overdue}d overdue</div>
      </td>
    </tr>`;
}

function shell({ heading, intro, bodyHtml, footer }) {
  return `
  <div style="background:#f4f7f5;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#00E08A 0%,#00B377 45%,#027A5F 100%);padding:26px 28px;">
        <div style="font-size:20px;font-weight:700;color:#04140f;">🌿 Content Hub</div>
        <div style="font-size:13px;color:#04140f;opacity:.85;margin-top:2px;">${heading}</div>
      </div>
      <div style="padding:26px 28px;">
        <p style="font-size:15px;color:#0f1e19;line-height:1.5;">${intro}</p>
        ${bodyHtml}
        <div style="text-align:center;margin:22px 0 6px;">
          <img src="${CAT_GIF}" width="220" alt="a supportive cat" style="border-radius:14px;max-width:100%;" />
        </div>
        <p style="font-size:12.5px;color:#6b8079;text-align:center;margin-top:6px;">(a cat, for moral support)</p>
      </div>
      <div style="background:#eef5f1;padding:14px 28px;font-size:11.5px;color:#6b8079;">
        ${footer || "Content Hub — werbegeschenk.eu content pipeline"}
      </div>
    </div>
  </div>`;
}

export async function sendOverdueEmail(to, name, items) {
  const resend = resendClient();
  const emoji = items.length >= 5 ? "🙀" : "🙂";
  const html = shell({
    heading: "a friendly heads up",
    intro: `Hi <b>${name}</b> ${emoji} — ${pick(NUDGES)}`,
    bodyHtml: `
      <p style="font-size:14px;color:#0f1e19;">You've got <b>${items.length}</b> item${items.length === 1 ? "" : "s"} past its deadline and not yet marked <i>Ready for Upload</i>:</p>
      <table style="width:100%;border-collapse:collapse;margin:14px 0;border:1px solid #e7ece9;border-radius:10px;overflow:hidden;">
        ${items.map(itemRow).join("")}
      </table>
      <p style="font-size:13.5px;color:#4a5f58;">No worries if it's already in progress — just didn't want it to slip through the cracks. 🌱</p>
    `,
    footer: "You're getting this because your manager has overdue-item reminders turned on. Ask them to pause yours anytime (sick days, PTO, etc).",
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
      <h4 style="font-size:13.5px;color:#0f1e19;margin:16px 0 4px;">👤 ${person} <span style="color:#6b8079;font-weight:400;">(${items.length} overdue)</span></h4>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e7ece9;border-radius:10px;overflow:hidden;">${items.map(itemRow).join("")}</table>`
    )
    .join("");
  const issuesSection = uploadIssues.length
    ? `
      <h4 style="font-size:13.5px;color:#0f1e19;margin:16px 0 4px;">🚧 Upload issues <span style="color:#6b8079;font-weight:400;">(${uploadIssues.length})</span></h4>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e7ece9;border-radius:10px;overflow:hidden;">
        ${uploadIssues.map((i) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #e7ece9;"><b>${i.topic}</b><div style="font-size:12px;color:#6b8079;">${i.uploadIssues || "no note"}</div></td></tr>`).join("")}
      </table>`
    : "";

  if (!peopleSection && !issuesSection) return; // nothing to report, skip the email entirely

  const html = shell({
    heading: "your daily check-in",
    intro: `Hi <b>${managerName || "there"}</b> 👋 — here's what's cooking on the board today.`,
    bodyHtml: peopleSection + issuesSection,
    footer: "You're getting this as a manager on Content Hub. Manage per-person reminder pauses from the Manager tab.",
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: "📋 Content Hub — daily overdue summary",
    html,
  });
}
