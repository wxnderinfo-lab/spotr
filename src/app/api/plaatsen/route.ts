import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

// Autocomplete voor woonplaatsen (openbare referentiedata uit de BAG).
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 2) return NextResponse.json([]);
  const safe = q.replace(/[%_,()]/g, "");
  const { data } = await createPublicClient()
    .from("places")
    .select("name, slug, municipality, province")
    .ilike("name", `${safe}%`)
    .order("name")
    .limit(8);
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "public, max-age=86400" } });
}
