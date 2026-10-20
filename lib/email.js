import { Resend } from "resend";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fmtDate, daysUntil } from "./format.js";

function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

// No emoji in the From name — trips spam filters.
const FROM = process.env.EMAIL_FROM || "SEO Content Hub WG.de <reminders@terradrom.com>";

// Werbegeschenk.de brand palette
const NAVY = "#032f79";
const YELLOW = "#fbd53b";
const INK = "#343133";
const SLATE = "#50616b";
const STONE = "#d8d4d4";

const NUDGES = [
  "nur ein kleiner, freundlicher Stups von deinem Content-Board! 🐾",
  "kein Stress – nur eine kurze Erinnerung vom Hub! ✨",
  "ich schau nur kurz vorbei, nichts Dramatisches! 🌱",
  "dein Board vermisst dich ein kleines bisschen! 💌",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CAT_GIF_COUNT = 20;

// Same cat all week, a new one next week. Shipped as a local file and
// attached inline (cid:) rather than linked to an external host — no
// dependency on a third-party image service being up, and no risk of an
// email client refusing to load a remote image from an unfamiliar sender.
function weeklyCatGifAttachment() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  const index = (week % CAT_GIF_COUNT) + 1;
  const filename = `cat-${String(index).padStart(2, "0")}.gif`;
  const filePath = path.join(process.cwd(), "public", "cat-gifs", filename);
  const content = readFileSync(filePath).toString("base64");
  return { filename, content, contentId: "weekly-cat-gif" };
}

// Logo goes inline for the same reason as the cat.
function logoAttachment() {
  const filePath = path.join(process.cwd(), "public", "logo.png");
  const content = readFileSync(filePath).toString("base64");
  return { filename: "werbegeschenk-de.png", content, contentId: "brand-logo" };
}

function attachments() {
  return [logoAttachment(), weeklyCatGifAttachment()];
}

function itemRow(i) {
  const overdue = Math.abs(daysUntil(i.deadline));
  return `
    <tr>
      <td class="item-row" style="padding:10px 14px;border-bottom:1px solid ${STONE};">
        <div class="email-text" style="font-weight:600;color:${INK};font-size:14px;">${i.topic}</div>
        <div class="email-muted" style="font-size:12px;color:${SLATE};margin-top:2px;">${i.type} · fällig am ${fmtDate(i.deadline)} · ${overdue} Tage überfällig</div>
      </td>
    </tr>`;
}

function shell({ heading, intro, bodyHtml, footer }) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  body { margin:0; padding:0; }
  .email-bg { background:#f2f1f1; }
  .email-card { background:#ffffff; }
  .email-text { color:${INK} !important; }
  .email-muted { color:${SLATE} !important; }
  .email-footer-bg { background:#f2f1f1; }
  .item-table { border:1px solid ${STONE}; }
  @media (prefers-color-scheme: dark) {
    .email-bg { background:#1f1d1e !important; }
    .email-card { background:${INK} !important; box-shadow:none !important; }
    .email-text { color:#f2f1f1 !important; }
    .email-muted { color:#b7b2b2 !important; }
    .email-footer-bg { background:#2a2829 !important; }
    .item-table { border-color:#4a4647 !important; }
    .item-row { border-bottom-color:#4a4647 !important; }
  }
</style>
</head>
<body class="email-bg">
  <div class="email-bg" style="padding:32px 16px;font-family:Roboto,Arial,Helvetica,sans-serif;">
    <div class="email-card" style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);">
      <div style="background:${NAVY};padding:22px 28px;border-bottom:4px solid ${YELLOW};">
        <img src="cid:brand-logo" width="200" alt="Werbegeschenk.de" style="display:block;max-width:100%;height:auto;border:0;" />
        <div style="font-size:13px;color:#ffffff;margin-top:10px;letter-spacing:.02em;">SEO Content Hub · <span style="color:${YELLOW};">${heading}</span></div>
      </div>
      <div style="padding:26px 28px;">
        <p class="email-text" style="font-size:15px;color:${INK};line-height:1.5;">${intro}</p>
        ${bodyHtml}
        <div style="text-align:center;margin:22px 0 6px;">
          <img src="cid:weekly-cat-gif" width="220" alt="eine Katze zur Motivation" style="border-radius:12px;max-width:100%;" />
        </div>
        <p class="email-muted" style="font-size:12.5px;color:${SLATE};text-align:center;margin-top:6px;">(eine Katze zur moralischen Unterstützung – jede Woche eine neue)</p>
      </div>
      <div class="email-footer-bg" style="background:#f2f1f1;padding:14px 28px;font-size:11.5px;">
        <span class="email-muted" style="color:${SLATE};">${footer}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const SICK_LEAVE_NOTE =
  "Bist du krank oder im Urlaub? Gib deinem Manager kurz Bescheid, dann werden deine Erinnerungen pausiert. 🌴";

export async function sendOverdueEmail(to, name, items) {
  const resend = resendClient();
  const emoji = items.length >= 5 ? "🙀" : "🙂";
  const html = shell({
    heading: "kurze Erinnerung",
    intro: `Hallo <b>${name}</b> ${emoji} – ${pick(NUDGES)}`,
    bodyHtml: `
      <p class="email-text" style="font-size:14px;color:${INK};">Du hast <b>${items.length}</b> Aufgabe${items.length === 1 ? "" : "n"}, deren Deadline vorbei ist und die noch nicht auf <i>Online</i> steh${items.length === 1 ? "t" : "en"}:</p>
      <table class="item-table" style="width:100%;border-collapse:collapse;margin:14px 0;border-radius:8px;overflow:hidden;">
        ${items.map(itemRow).join("")}
      </table>
      <p class="email-muted" style="font-size:13.5px;color:${SLATE};">Kein Problem, falls du schon dran bist – wir wollten nur nicht, dass etwas untergeht. 🌱</p>
    `,
    footer: SICK_LEAVE_NOTE,
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Hallo ${name} – ${items.length} Aufgabe${items.length === 1 ? " wartet" : "n warten"} auf dich`,
    html,
    attachments: attachments(),
  });
}

export async function sendManagerSummary(to, byPerson, managerName) {
  const resend = resendClient();
  const peopleSection = Object.entries(byPerson)
    .map(
      ([person, items]) => `
      <h4 class="email-text" style="font-size:13.5px;color:${INK};margin:16px 0 4px;">👤 ${person} <span class="email-muted" style="color:${SLATE};font-weight:400;">(${items.length} überfällig)</span></h4>
      <table class="item-table" style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">${items.map(itemRow).join("")}</table>`
    )
    .join("");

  if (!peopleSection) return; // nothing to report, skip the email entirely

  const html = shell({
    heading: "dein täglicher Überblick",
    intro: `Hallo <b>${managerName || "zusammen"}</b> 👋 – das ist heute auf dem Board liegen geblieben.`,
    bodyHtml: peopleSection,
    footer: "Erinnerungen einzelner Personen pausierst du im Manager-Tab → Benachrichtigungen.",
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: "SEO Content Hub WG.de – tägliche Übersicht überfälliger Aufgaben",
    html,
    attachments: attachments(),
  });
}
