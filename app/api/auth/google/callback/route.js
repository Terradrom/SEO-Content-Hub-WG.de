import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSessionProfile } from "../../../../../lib/supabase-ssr-server";
import { oauthClient } from "../../../../../lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "manager") {
    return NextResponse.json({ error: "manager only" }, { status: 403 });
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "missing ?code from Google" }, { status: 400 });
  }

  const client = oauthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    return new NextResponse(
      "Google didn't return a refresh token (usually means this account already granted access before). " +
        "Revoke access at https://myaccount.google.com/permissions and try /api/auth/google/start again.",
      { status: 400 }
    );
  }

  // Dev convenience: write straight into .env.local so no manual copy/paste
  // of the token is needed. In production (Vercel) this instead needs to be
  // set as an env var in the project settings — see Phase 5.
  const envPath = path.join(process.cwd(), ".env.local");
  let env = await readFile(envPath, "utf-8");
  env = env.replace(/GOOGLE_OAUTH_REFRESH_TOKEN=.*/, `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
  await writeFile(envPath, env);

  return new NextResponse(
    "Drive connected. Restart the dev server (env vars only load on boot) and uploads will work.",
    { status: 200 }
  );
}
