import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Account verwijderen. De database controleert eerst (can_delete_account) of
// er geen lopende opdracht of actief abonnement is; daarna verwijdert de
// server het Auth-account met de service role. Alle profieldata volgt via
// ON DELETE CASCADE; berichten blijven zonder afzender bestaan.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const back = (q: string) => NextResponse.redirect(new URL(`/account/instellingen${q}`, request.url), 303);
  if (form.get("confirm") !== "VERWIJDER") return back("?fout=bevestigen#data");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/inloggen", request.url), 303);
  const { data: check } = await supabase.rpc("can_delete_account");
  if (check !== "ok") return back("#data");

  const admin = createAdminClient();
  // eigen bestanden in openbare buckets opruimen
  for (const bucket of ["avatars", "portfolio", "job-media"]) {
    const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return back("?fout=verwijderen#data");
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/?account=verwijderd", request.url), 303);
}
