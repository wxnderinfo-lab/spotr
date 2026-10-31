import type { Metadata } from "next";
import { requireModerator } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";

export const metadata: Metadata = { title: { default: "Beheer", template: "%s | Beheer Jobmarkt" }, robots: { index: false, follow: false } };

// Toegang: alleen moderators en admins (rollen in user_roles, door een admin
// toegekend). De database controleert de rol bij elke actie opnieuw.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireModerator("/beheer");
  const items: [string, string, boolean][] = [
    ["/beheer", "Overzicht", false],
    ["/beheer/meldingen", "Meldingen", false],
    ["/beheer/opdrachten", "Moderatie en geschillen", false],
    ["/beheer/verificaties", "KVK-controles", true],
    ["/beheer/gebruikers", "Gebruikers", true],
    ["/beheer/kennisbank", "Kennisbank", true],
    ["/beheer/instellingen", "Instellingen", true],
    ["/beheer/audit", "Auditlog", true],
  ];
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Beheer" className="min-w-0">
        <p className="mb-2 px-3 text-sm text-muted">Beheer · {me.status.is_admin ? "admin" : "moderator"}</p>
        <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {items.filter(([, , adminOnly]) => !adminOnly || me.status.is_admin).map(([href, label]) => (
            <li key={href} className="shrink-0"><NavLink href={href} exact={href === "/beheer"} className="block !no-underline aria-[current=page]:bg-surface">{label}</NavLink></li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
