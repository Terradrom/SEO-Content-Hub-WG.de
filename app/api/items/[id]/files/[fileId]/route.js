import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../../../lib/supabase-ssr-server";
import { deleteFromStorage } from "../../../../../../lib/supabase-storage";
import { deleteFileFromDrive } from "../../../../../../lib/google-drive";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { data: fileRow, error: fetchError } = await supabase
    .from("item_files")
    .select("*")
    .eq("id", params.fileId)
    .eq("item_id", params.id)
    .single();

  if (fetchError || !fileRow) {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }

  try {
    if (fileRow.storage_path) {
      await deleteFromStorage(fileRow.storage_path);
    } else if (fileRow.drive_file_id) {
      // Legacy row from before the Drive -> Supabase Storage switch.
      await deleteFileFromDrive(fileRow.drive_file_id);
    }
  } catch (err) {
    // Storage/Drive-side delete failing shouldn't block removing the record — log and continue.
    console.error("File delete failed:", err.message);
  }

  const { error } = await supabase.from("item_files").delete().eq("id", params.fileId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
