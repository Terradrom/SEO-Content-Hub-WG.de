import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../../lib/supabase-ssr-server";
import { uploadFileToDrive } from "../../../../../lib/google-drive";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "no file in request" }, { status: 400 });
  }

  let uploaded;
  try {
    uploaded = await uploadFileToDrive(file);
  } catch (err) {
    return NextResponse.json({ error: `Drive upload failed: ${err.message}` }, { status: 502 });
  }

  const supabase = supabaseAdmin();
  const sizeLabel = Math.round(file.size / 1024) + " KB";
  const { data, error } = await supabase
    .from("item_files")
    .insert({
      item_id: params.id,
      name: uploaded.name,
      drive_file_id: uploaded.driveFileId,
      web_view_link: uploaded.webViewLink,
      size_label: sizeLabel,
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
  });
}
