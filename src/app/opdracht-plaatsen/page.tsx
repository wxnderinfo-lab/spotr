import type { Metadata } from "next";
import { getCategoryTree } from "@/lib/data";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rel } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JobWizard, type WizardInitial } from "@/components/JobWizard";

export const metadata: Metadata = {
  title: "Opdracht plaatsen",
  description: "Plaats gratis je opdracht en ontvang voorstellen van professionals. Je ziet je opdracht terug voordat hij online gaat.",
  alternates: { canonical: "/opdracht-plaatsen" },
};

export default async function PostJobPage({ searchParams }: { searchParams: Promise<{ concept?: string; categorie?: string }> }) {
  const { concept, categorie } = await searchParams;
  const [tree, me] = await Promise.all([getCategoryTree(), getMe()]);
  let initial: WizardInitial | null = null;
  if (concept && me) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("jobs")
      .select("id, category_id, title, description, work_mode, budget_type, budget_min_cents, budget_max_cents, timing, due_date, answers, place:places(name, slug)")
      .eq("id", concept)
      .eq("client_id", me.id)
      .eq("status", "concept")
      .maybeSingle();
    if (data) {
      const place = rel(data.place) as { name: string; slug: string } | null;
      initial = {
        id: data.id,
        category_id: String(data.category_id),
        title: data.title,
        description: data.description,
        work_mode: data.work_mode,
        place_slug: place?.slug ?? "",
        place_name: place?.name ?? "",
        budget_type: data.budget_type,
        budget_min: data.budget_min_cents ? String(data.budget_min_cents / 100) : "",
        budget_max: data.budget_max_cents ? String(data.budget_max_cents / 100) : "",
        timing: data.timing,
        due_date: data.due_date ?? "",
        answers: (data.answers ?? {}) as Record<string, string>,
      };
    }
  }
  const preset = categorie ? tree.flatMap((p) => [p, ...p.children]).find((c) => c.slug === categorie) : undefined;
  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumbs items={[{ name: "Opdracht plaatsen" }]} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">Plaats een opdracht</h1>
      <p className="mt-2 text-lg text-ink-soft">Gratis en in een paar minuten. Je ziet alles terug voordat het online gaat.</p>
      <noscript>
        <p className="mt-6 rounded-xl border border-warn/30 bg-warn-soft p-4">Voor het plaatsen van een opdracht is JavaScript nodig. Zet het aan in je browser.</p>
      </noscript>
      <JobWizard
        categories={tree.map((p) => ({ id: p.id, name: p.name, children: p.children.map((c) => ({ id: c.id, name: c.name, work_mode: c.work_mode, questions: c.questions, regulation_note: c.regulation_note })) }))}
        loggedIn={!!me}
        onboarded={!!me?.status.onboarded}
        canContract={!!me?.status.can_contract}
        initial={initial}
        presetCategoryId={preset && preset.parent_id ? String(preset.id) : undefined}
      />
    </div>
  );
}
