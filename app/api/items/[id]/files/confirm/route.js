import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../../../lib/supabase-ssr-server";

export const dynamic = "force-dynamic";

// Step 3: after the browser has uploaded the actual bytes straight to
// Storage using the signed URL from /sign, record the item_files row.
export async function POST(request, { params }) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name, path, publicUrl, size, category } = await request.json();
  if (!name || !path || !publicUrl) {
    return NextResponse.json({ error: "name, path, and publicUrl are required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("item_files")
    .insert({
      item_id: params.id,
      name,
      storage_path: path,
      web_view_link: publicUrl,
      size_label: size,
      category: category === "media" ? "media" : "document",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    size: data.size_label,
    addedAt: data.added_at,
    url: data.web_view_link,
    category: data.category,
  });
}
