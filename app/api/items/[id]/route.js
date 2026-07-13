import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../lib/supabase-ssr-server";
import { rowToItem, itemPatchToRow, fieldsAllowedForRole } from "../../../../lib/items-map";

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

  // Handoff side effect: moving a card to "Ready for Upload" queues it for
  // the upload team automatically. This has to happen server-side (not as
  // a client-sent field) since a content-role request isn't allowed to set
  // upload_status directly.
  if (row.content_status === "Ready for Upload") {
    const { data: current } = await supabase.from("items").select("upload_status").eq("id", params.id).single();
    if (current && !current.upload_status) {
      row.upload_status = "Queued";
    }
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
