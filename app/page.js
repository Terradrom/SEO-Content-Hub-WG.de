import AppShell from "../components/AppShell";
import { getSessionProfile } from "../lib/supabase-ssr-server";

export default async function Page() {
  const { user, profile } = await getSessionProfile();
  return <AppShell user={user} profile={profile} />;
}
