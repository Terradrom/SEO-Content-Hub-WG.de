"use client";
import { createBrowserClient } from "@supabase/ssr";

let client;

// Singleton browser client — safe to call from any client component.
export function supabaseBrowser() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
