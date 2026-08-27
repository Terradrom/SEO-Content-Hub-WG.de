import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./supabase-server";

const BUCKET = "item-files";

export async function deleteFromStorage(path) {
  if (!path) return;
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

// Vercel serverless functions cap request bodies at ~4.5MB, so routing the
// actual file bytes through our API is a hard ceiling on upload size. A
// signed upload URL lets the browser send the file straight to Supabase
// Storage instead — our server only ever handles small JSON (the sign
// request, then the metadata confirm after upload), so the real limit
// becomes Supabase's own (50MB/file on this project).
export async function createSignedUpload(fileName, typeName) {
  const supabase = supabaseAdmin();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = (typeName || "Other").replace(/[^a-zA-Z0-9 _-]/g, "");
  const path = `${folder}/${randomUUID()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error(`Could not prepare upload: ${error.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, token: data.token, publicUrl: pub.publicUrl };
}
