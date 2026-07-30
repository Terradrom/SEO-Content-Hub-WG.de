import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./supabase-server";

const BUCKET = "item-files";

export async function uploadToStorage(file, typeName) {
  const supabase = supabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = (typeName || "Other").replace(/[^a-zA-Z0-9 _-]/g, "");
  const path = `${folder}/${randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: pub.publicUrl, name: file.name };
}

export async function deleteFromStorage(path) {
  if (!path) return;
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}
