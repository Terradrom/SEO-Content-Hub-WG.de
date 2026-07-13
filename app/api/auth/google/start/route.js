import { NextResponse } from "next/server";
import { getSessionProfile } from "../../../../../lib/supabase-ssr-server";
import { oauthClient } from "../../../../../lib/google-drive";

export const dynamic = "force-dynamic";

// One-time "connect your Drive" flow — manager-only, since this determines
// whose Drive account content files get uploaded to.
export async function GET() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "manager") {
    return NextResponse.json({ error: "manager only" }, { status: 403 });
  }

  const client = oauthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this account has consented before
    scope: ["https://www.googleapis.com/auth/drive"],
  });

  return NextResponse.redirect(url);
}
