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

  // Dev convenience only — best-effort, silently skipped if the filesystem
  // is read-only (e.g. Vercel production). Either way the token is also
  // shown below so it can be pasted into Vercel's env var manually.
  let wroteLocalFile = false;
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let env = await readFile(envPath, "utf-8");
    env = env.replace(/GOOGLE_OAUTH_REFRESH_TOKEN=.*/, `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    await writeFile(envPath, env);
    wroteLocalFile = true;
  } catch {
    // read-only filesystem (production) — that's fine, show the token instead
  }

  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;">
  <h2>✅ Drive connected</h2>
  ${
    wroteLocalFile
      ? "<p>Written to <code>.env.local</code> — restart the dev server and uploads will work.</p>"
      : `<p><b>Copy this refresh token</b> and paste it as the value of <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>
         in Vercel → Project → Settings → Environment Variables, then redeploy.</p>
         <textarea readonly style="width:100%;height:80px;font-family:monospace;font-size:13px;padding:8px;"
           onclick="this.select()">${tokens.refresh_token}</textarea>
         <p style="color:#666;font-size:13px;">This page is only reachable by a signed-in manager, but treat the
         value above like a password — don't paste it anywhere except Vercel's env var field.</p>`
  }
</body></html>`;

  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html" } });
}
