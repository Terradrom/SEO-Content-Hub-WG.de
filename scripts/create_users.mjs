// One-off: create Supabase Auth users + set their profiles.role.
// Usage: node --env-file=.env.local scripts/create_users.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Fill in the German team before running. role: "content" | "media" | "manager".
// Optional extra roles for people who do both: roles: ["content", "media"].
const USERS = [
  // { email: "name@beispiel.de", role: "manager", name: "Vorname" },
  // { email: "name@beispiel.de", role: "content", name: "Vorname" },
  // { email: "name@beispiel.de", role: "media", name: "Vorname", simplePassword: true },
];

function tempPassword() {
  return randomBytes(9).toString("base64url"); // ~12 chars, URL-safe
}

// Easier to read/type/say out loud than the base64url passwords above,
// while still reasonably resistant to guessing.
const WORDS = ["Cedar", "Harbor", "Meadow", "Quartz", "Sable", "Willow", "Ember", "Falcon"];
function simplePassword() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}`;
}

async function main() {
  const results = [];
  for (const u of USERS) {
    const password = u.simplePassword ? simplePassword() : tempPassword();
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
          await supabase.from("profiles").update({ role: u.role, roles: u.roles || [u.role], display_name: u.name }).eq("id", existing.id);
          continue;
        }
      }
      console.error(`Failed for ${u.email}:`, error.message);
      continue;
    }
    const userId = data.user.id;
    await supabase.from("profiles").update({ role: u.role, roles: u.roles || [u.role], display_name: u.name }).eq("id", userId);
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
