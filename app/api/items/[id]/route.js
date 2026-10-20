import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../lib/supabase-ssr-server";
import { rowToItem, itemPatchToRow, fieldsAllowedForRoles, applyHandoffs } from "../../../../lib/items-map";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const patch = await request.json();
  const allowed = fieldsAllowedForRoles(profile.roles);

  const filteredPatch = {};
  for (const key of Object.keys(patch)) {
    if (allowed.includes(key)) filteredPatch[key] = patch[key];
  }
  const row = itemPatchToRow(filteredPatch);

  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: `no fields your role (${profile.role}) can edit were in the request` }, { status: 403 });
  }

  const supabase = supabaseAdmin();

  // The content -> media handoff needs the row's pre-patch state and has to
  // happen server-side, since the content team can't set the media field.
  if ("content_status" in row) {
    const { data: current } = await supabase.from("items").select("content_status, media_status").eq("id", params.id).single();
    applyHandoffs(row, current);
  }

  const { data, error } = await supabase.from("items").update(row).eq("id", params.id).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(rowToItem(data));
}
