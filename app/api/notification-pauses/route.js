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
    .from("notification_pauses")
    .select("*, profiles!notification_pauses_profile_id_fkey(display_name, email)")
    .order("starts_on", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "manager") {
    return NextResponse.json({ error: "manager only" }, { status: 403 });
  }

  const body = await request.json();
  const { profileId, startsOn, endsOn, note } = body;
  if (!profileId || !startsOn || !endsOn) {
    return NextResponse.json({ error: "profileId, startsOn, endsOn are required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("notification_pauses")
    .insert({ profile_id: profileId, starts_on: startsOn, ends_on: endsOn, note, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
