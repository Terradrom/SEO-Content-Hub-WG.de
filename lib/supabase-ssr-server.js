import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server component / route handler client — reads the caller's session
// from cookies, so RLS-style "who is this" checks reflect the real user
// (unlike lib/supabase-server.js's service-role admin client).
export function supabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component render — middleware handles refresh instead
        }
      },
    },
  });
}

export async function getSessionProfile() {
  const supabase = supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profile && (!profile.roles || profile.roles.length === 0)) {
    // Defensive fallback for any profile predating the multi-role column
    // (or created before a fresh signup's roles get set) — treat their
    // single `role` as a one-item roles list rather than granting nothing.
    profile.roles = profile.role ? [profile.role] : [];
  }
  return { user, profile };
}
