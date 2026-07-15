import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-server";
import { getSessionProfile } from "../../../lib/supabase-ssr-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "manager") {
    return NextResponse.json({ error: "manager only" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .not("role", "is", null)
    .order("display_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
