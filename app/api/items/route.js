import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-server";
import { rowToItem } from "../../../lib/items-map";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("items")
    .select("*, item_files(*)")
    .order("deadline", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data.map(rowToItem));
}
