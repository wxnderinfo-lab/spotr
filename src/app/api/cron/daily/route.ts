import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailConfigured, render, sendEmail } from "@/lib/email";
import { site } from "@/config/site";
import { jobHref } from "@/lib/data";

// Dagelijkse taak (Vercel Cron, zie vercel.json). Beveiligd met CRON_SECRET.
// 1. Verlopen opdrachten sluiten  2. Bewaartermijnen toepassen
// 3. E-mailwachtrij versturen      4. Zoekmeldingen voor Pro
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const result: Record<string, unknown> = {};

  result.expired = (await admin.rpc("expire_jobs")).data;
  result.retention = (await admin.rpc("apply_retention")).data;

  // zoekmeldingen: opdrachten van de afgelopen dag die passen, alleen voor Pro
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: searches } = await admin.from("saved_searches").select("id, user_id, name, params, last_notified_at").eq("kind", "opdrachten").eq("notify", true);
  let alerts = 0;
  for (const s of searches ?? []) {
    const { data: pro } = await admin.rpc("has_pro", { p_user: s.user_id });
    if (!pro) continue;
    const p = s.params as Record<string, string>;
    let q = admin.from("jobs").select("id, slug, code, title, category_id, work_mode, published_at, search_vector").eq("status", "open").eq("moderation_status", "ok").gt("published_at", s.last_notified_at ?? since);
    if (p.waar) q = q.eq("work_mode", p.waar);
    if (p.categorie) {
      const { data: ids } = await admin.rpc("category_and_children", { p_slug: p.categorie });
      q = q.in("category_id", (ids ?? []) as number[]);
    }
    if (p.q) q = q.textSearch("search_vector", p.q, { config: "dutch", type: "websearch" });
    const { data: jobs } = await q.limit(10);
    if (!jobs?.length) continue;
    const { data: u } = await admin.auth.admin.getUserById(s.user_id);
    if (!u.user?.email) continue;
    await admin.from("email_outbox").insert({
      to_email: u.user.email,
      template: "zoekmelding",
      payload: { name: s.name, count: jobs.length, jobs: jobs.map((j) => ({ title: j.title, url: `${site.url}${jobHref(j)}` })) },
    });
    await admin.from("notifications").insert({ user_id: s.user_id, kind: "zoekmelding", title: `${jobs.length} nieuwe opdracht(en) voor "${s.name}"`, body: jobs.map((j) => j.title).slice(0, 3).join(" · "), link: "/opdrachten" });
    await admin.from("saved_searches").update({ last_notified_at: new Date().toISOString() }).eq("id", s.id);
    alerts++;
  }
  result.search_alerts = alerts;

  // e-mailwachtrij
  if (emailConfigured()) {
    const { data: queue } = await admin.from("email_outbox").select("id, to_email, template, payload, attempts").eq("status", "wachtrij").lt("attempts", 5).limit(100);
    let sent = 0;
    for (const m of queue ?? []) {
      const mail = render(m.template, m.payload as Record<string, unknown>);
      if (!mail) continue;
      try {
        await sendEmail(m.to_email, mail);
        await admin.from("email_outbox").update({ status: "verstuurd", sent_at: new Date().toISOString(), attempts: m.attempts + 1 }).eq("id", m.id);
        sent++;
      } catch (e) {
        await admin.from("email_outbox").update({ attempts: m.attempts + 1, error: (e as Error).message, status: m.attempts + 1 >= 5 ? "mislukt" : "wachtrij" }).eq("id", m.id);
      }
    }
    result.emails_sent = sent;
  } else {
    result.emails_sent = "niet geconfigureerd";
  }
  return NextResponse.json(result);
}
