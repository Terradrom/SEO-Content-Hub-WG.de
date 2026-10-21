// Sets display name and role(s) for an existing user (created in the
// Supabase dashboard). The display name must match the "person" on the
// tasks (e.g. "Katarina"), otherwise the writer sees nothing of their own.
//
// Usage:
//   node --env-file=.env.local scripts/set_profile.mjs <email> <Name> <content|media|manager>[,<role>]
import { createClient } from "@supabase/supabase-js";

const [, , email, name, roleArg] = process.argv;
if (!email || !name || !roleArg) {
  console.error("Usage: node --env-file=.env.local scripts/set_profile.mjs <email> <Name> <content|media|manager>[,<role>]");
  process.exit(1);
}
const roles = roleArg.split(",").map((r) => r.trim());
if (roles.some((r) => !["content", "media", "manager"].includes(r))) {
  console.error("Roles must be content, media or manager.");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: list, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No user with email ${email} – create it first in Supabase (Authentication → Users → Add user).`);
  process.exit(1);
}
const { error: upErr } = await supabase
  .from("profiles")
  .upsert({ id: user.id, email: user.email, display_name: name, role: roles[0], roles });
if (upErr) throw upErr;
const { count } = await supabase.from("items").select("id", { count: "exact", head: true }).eq("person", name);
console.log(`${email}: ${name} · ${roles.join(" + ")} · ${count ?? 0} Aufgaben zugewiesen`);
