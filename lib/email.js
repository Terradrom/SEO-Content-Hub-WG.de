import { Resend } from "resend";
import { fmtDate } from "./format";

function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "Content Hub <reminders@terradrom.com>";

function itemListHtml(items) {
  return items
    .map((i) => `<li><b>${i.topic}</b> — ${i.type}, due ${fmtDate(i.deadline)}</li>`)
    .join("");
}

export async function sendOverdueEmail(to, name, items) {
  const resend = resendClient();
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${items.length} overdue item${items.length === 1 ? "" : "s"} — Content Hub`,
    html: `
      <p>Hi ${name},</p>
      <p>These items are past their deadline and still not marked Ready for Upload:</p>
      <ul>${itemListHtml(items)}</ul>
      <p>No action needed if this is already being handled — just a heads up.</p>
    `,
  });
}

export async function sendManagerSummary(to, byPerson, uploadIssues) {
  const resend = resendClient();
  const peopleSection = Object.entries(byPerson)
    .map(([person, items]) => `<h4>${person} (${items.length})</h4><ul>${itemListHtml(items)}</ul>`)
    .join("");
  const issuesSection = uploadIssues.length
    ? `<h4>Upload issues (${uploadIssues.length})</h4><ul>${uploadIssues
        .map((i) => `<li><b>${i.topic}</b> — ${i.uploadIssues || "no note"}</li>`)
        .join("")}</ul>`
    : "";

  if (!peopleSection && !issuesSection) return; // nothing to report

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Content Hub — daily overdue summary",
    html: `<p>Daily check-in:</p>${peopleSection}${issuesSection}`,
  });
}
