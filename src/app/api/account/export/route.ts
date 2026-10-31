import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// AVG art. 15/20: eigen gegevens als JSON. De database bepaalt via
// export_my_data() wat erin zit (alleen gegevens van de gebruiker zelf).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "niet_ingelogd" }, { status: 401 });
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "export_mislukt" }, { status: 500 });
  return new NextResponse(JSON.stringify({ account: { id: user.id, email: user.email, created_at: user.created_at }, ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobmarkt-gegevens-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
