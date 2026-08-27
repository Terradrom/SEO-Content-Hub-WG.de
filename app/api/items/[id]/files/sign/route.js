import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../../lib/supabase-server";
import { getSessionProfile } from "../../../../../../lib/supabase-ssr-server";
import { createSignedUpload } from "../../../../../../lib/supabase-storage";

export const dynamic = "force-dynamic";

// Step 1 of the upload flow: ask for a signed URL to upload straight to
// Supabase Storage from the browser (see supabase-storage.js for why).
export async function POST(request, { params }) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile?.role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { fileName } = await request.json();
  if (!fileName) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: item } = await supabase.from("items").select("type").eq("id", params.id).single();

  try {
    const signed = await createSignedUpload(fileName, item?.type);
    return NextResponse.json(signed);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
