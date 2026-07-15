import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../lib/supabase-ssr-server";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "manager") {
    return NextResponse.json({ error: "manager only" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("notification_pauses").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
