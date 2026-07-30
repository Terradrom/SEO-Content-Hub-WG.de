import { NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseAdmin } from "../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../lib/supabase-ssr-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "item-files";

export async function GET() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== "manager") {
    return NextResponse.json({ error: "manager only" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { data: files, error } = await supabase
    .from("item_files")
    .select("name, storage_path, item_id")
    .not("storage_path", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!files.length) return NextResponse.json({ error: "no files to export" }, { status: 404 });

  const zip = new JSZip();
  for (const f of files) {
    const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(f.storage_path);
    if (dlError || !blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    zip.file(`${f.item_id}/${f.name}`, buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="content-hub-files-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
