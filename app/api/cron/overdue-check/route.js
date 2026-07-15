import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../lib/supabase-ssr-server";
import { rowToItem } from "../../../../lib/items-map";
import { computeOverdueReport, isPaused } from "../../../../lib/overdue";
import { sendOverdueEmail, sendManagerSummary } from "../../../../lib/email";

export const dynamic = "force-dynamic";

async function isAuthorized(request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  const { user, profile } = await getSessionProfile();
  return !!user && profile?.role === "manager";
}

export async function GET(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const [{ data: itemRows }, { data: profiles }, { data: pauses }] = await Promise.all([
    supabase.from("items").select("*, item_files(*)"),
    supabase.from("profiles").select("*"),
    supabase.from("notification_pauses").select("*"),
  ]);

  const items = (itemRows || []).map(rowToItem);
  const { byPerson, uploadIssues, totalOverdue } = computeOverdueReport(items);

  const profileByName = new Map((profiles || []).filter((p) => p.display_name).map((p) => [p.display_name, p]));
  const managers = (profiles || []).filter((p) => p.role === "manager" && p.email);

  const sentTo = [];
  const skippedPaused = [];

  for (const [person, personItems] of Object.entries(byPerson)) {
    const profile = profileByName.get(person);
    if (!profile?.email) continue;
    if (isPaused(pauses || [], profile.id)) {
      skippedPaused.push(person);
      continue;
    }
    await sendOverdueEmail(profile.email, profile.display_name, personItems);
    sentTo.push(person);
  }

  for (const manager of managers) {
    await sendManagerSummary(manager.email, byPerson, uploadIssues, manager.display_name);
  }

  return NextResponse.json({
    totalOverdue,
    uploadIssuesCount: uploadIssues.length,
    emailedPeople: sentTo,
    skippedPaused,
    managerSummariesSentTo: managers.map((m) => m.email),
  });
}
