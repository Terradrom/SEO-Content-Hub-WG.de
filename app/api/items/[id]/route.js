import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-server";
import { rowToItem, itemPatchToRow } from "../../../../lib/items-map";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const patch = await request.json();
  const row = itemPatchToRow(patch);

  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: "no patchable fields in body" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
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
