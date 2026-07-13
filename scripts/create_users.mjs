// One-off: create Supabase Auth users + set their profiles.role.
// Usage: node --env-file=.env.local scripts/create_users.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const USERS = [
  { email: "mironmueller41@gmail.com", role: "manager", name: "Miron" },
  { email: "tarynkondrollochis@gmail.com", role: "content", name: "Mia" },
  { email: "ashveenaanne@gmail.com", role: "content", name: "Ashveena" },
  { email: "michelle.bridget@gmail.com", role: "content", name: "Michelle" },
];

function tempPassword() {
  return randomBytes(9).toString("base64url"); // ~12 chars, URL-safe
}

async function main() {
  const results = [];
  for (const u of USERS) {
    const password = tempPassword();
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
    });
    if (error) {
      // If the user already exists, look them up instead of failing the whole run.
      if (error.message.includes("already been registered") || error.status === 422) {
        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list.users.find((x) => x.email === u.email);
        if (existing) {
          results.push({ ...u, id: existing.id, password: "(already existed — password unchanged)" });
          await supabase.from("profiles").update({ role: u.role, display_name: u.name }).eq("id", existing.id);
          continue;
        }
      }
      console.error(`Failed for ${u.email}:`, error.message);
      continue;
    }
    const userId = data.user.id;
    await supabase.from("profiles").update({ role: u.role, display_name: u.name }).eq("id", userId);
    results.push({ ...u, id: userId, password });
  }

  console.log("\nAccounts ready — share these credentials securely (e.g. not over plain email):\n");
  for (const r of results) {
    console.log(`${r.name} (${r.role}) — ${r.email} / ${r.password}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
