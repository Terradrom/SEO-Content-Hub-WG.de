import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../lib/supabase-ssr-server";
import { rowToItem, itemPatchToRow, fieldsAllowedForRole, applyHandoffs } from "../../../../lib/items-map";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const patch = await request.json();
  const allowed = fieldsAllowedForRole(profile.role);

  const filteredPatch = {};
  for (const key of Object.keys(patch)) {
    if (allowed.includes(key)) filteredPatch[key] = patch[key];
  }
  const row = itemPatchToRow(filteredPatch);

  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: `no fields your role (${profile.role}) can edit were in the request` }, { status: 403 });
  }

  const supabase = supabaseAdmin();

  // Cross-team handoffs (content -> upload -> media -> upload) need the
  // row's pre-patch state and have to happen server-side, since no single
  // role is allowed to set another team's status field directly.
  if ("content_status" in row || "upload_status" in row || "media_status" in row) {
    const { data: current } = await supabase.from("items").select("upload_status, media_status").eq("id", params.id).single();
    applyHandoffs(row, current);
  }

  const { data, error } = await supabase
    .from("items")
    .update(row)
    .eq("id", params.id)
    .select("*, item_files(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(rowToItem(data));
}
