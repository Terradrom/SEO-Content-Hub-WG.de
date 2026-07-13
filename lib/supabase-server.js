import { createClient } from "@supabase/supabase-js";

// Server-only client — uses the service role key, bypasses RLS.
// Only import this from API routes / server components, never from
// anything bundled to the client.
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
