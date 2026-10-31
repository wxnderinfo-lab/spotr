import type { Metadata } from "next";
import { requireMe } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { signOut } from "@/actions/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe("/account");
  const s = me.status;
  const items: [string, string, number?][] = [
    ["/account", "Overzicht"],
    ["/account/opdrachten", "Mijn opdrachten"],
    ...(me.profile.is_provider ? ([["/account/voorstellen", "Mijn voorstellen"]] as [string, string][]) : []),
    ["/berichten", "Berichten", s.unread_messages],
    ["/account/meldingen", "Meldingen", s.unread_notifications],
    ["/account/profiel", "Profiel en portfolio"],
    ["/account/favorieten", "Bewaard en zoekopdrachten"],
    ["/account/beoordelingen", "Beoordelingen"],
    ["/account/abonnement", "Abonnement"],
    ["/account/instellingen", "Instellingen en privacy"],
    ["/account/meldingen-en-bezwaar", "Meldingen en bezwaar"],
    ...(s.is_moderator ? ([["/beheer", "Beheer"]] as [string, string][]) : []),
  ];
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[15rem_1fr]">
      <aside className="min-w-0">
        <nav aria-label="Account" className="lg:sticky lg:top-20">
          <p className="mb-2 px-3 text-sm text-muted">Ingelogd als <span className="font-semibold text-ink">{me.profile.display_name}</span></p>
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {items.map(([href, label, count]) => (
              <li key={href} className="shrink-0">
                <NavLink href={href} exact={href === "/account"} className="flex items-center justify-between gap-2 !no-underline aria-[current=page]:bg-surface aria-[current=page]:shadow-[var(--shadow-card)]">
                  {label}
                  {count ? <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-white">{count}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
          <form action={signOut} className="mt-2 hidden px-3 lg:block">
            <button type="submit" className="text-sm text-muted hover:text-ink hover:underline">Uitloggen</button>
          </form>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
