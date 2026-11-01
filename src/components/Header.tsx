import Link from "next/link";
import { Bell, MessageSquare, Plus, Menu, User } from "lucide-react";
import { getMe } from "@/lib/auth";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { LiveCount } from "./live/LiveProvider";

const mainNav = [
  { href: "/opdrachten", label: "Vind werk" },
  { href: "/professionals", label: "Vind een professional" },
  { href: "/categorieen", label: "Categorieën" },
  { href: "/hoe-het-werkt", label: "Hoe het werkt" },
];

export async function Header() {
  const me = await getMe();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <a href="#inhoud" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Naar de inhoud
      </a>
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" aria-label="Jobmarkt, naar de homepage" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Hoofdmenu" className="ml-2 hidden items-center gap-0.5 xl:flex">
          {mainNav.map((n) => (
            <NavLink key={n.href} href={n.href}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {me ? (
            <>
              <Link href="/berichten" className="btn-ghost relative hidden px-3 sm:inline-flex" aria-label="Berichten">
                <MessageSquare className="h-5 w-5" aria-hidden />
                <LiveCount kind="messages" fallback={me.status.unread_messages} label="ongelezen berichten" />
              </Link>
              <Link href="/account/meldingen" className="btn-ghost relative px-3" aria-label="Meldingen">
                <Bell className="h-5 w-5" aria-hidden />
                <LiveCount kind="notifications" fallback={me.status.unread_notifications} label="nieuwe meldingen" />
              </Link>
              <Link href="/account" className="btn-ghost hidden px-3 sm:inline-flex">
                <User className="h-5 w-5" aria-hidden />
                <span className="max-w-32 truncate">{me.profile.display_name || "Account"}</span>
              </Link>
            </>
          ) : (
            <Link href="/inloggen" className="btn-ghost hidden sm:inline-flex">Inloggen</Link>
          )}
          <Link href="/opdracht-plaatsen" className="btn-primary hidden whitespace-nowrap sm:inline-flex">
            <Plus className="h-4 w-4" aria-hidden />
            Plaats een opdracht
          </Link>
          <details className="relative xl:hidden">
            <summary className="btn-ghost list-none px-3 [&::-webkit-details-marker]:hidden" aria-label="Menu openen">
              <Menu className="h-5 w-5" aria-hidden />
            </summary>
            <nav aria-label="Menu" className="card absolute right-0 mt-2 w-64 p-2">
              {mainNav.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 hover:bg-sunken">{n.label}</Link>
              ))}
              <Link href="/prijzen" className="block rounded-lg px-3 py-2.5 hover:bg-sunken">Prijzen</Link>
              <Link href="/kennisbank" className="block rounded-lg px-3 py-2.5 hover:bg-sunken">Kennisbank</Link>
              <hr className="my-2 border-line" />
              {me ? (
                <Link href="/account" className="block rounded-lg px-3 py-2.5 hover:bg-sunken">Mijn account</Link>
              ) : (
                <>
                  <Link href="/inloggen" className="block rounded-lg px-3 py-2.5 hover:bg-sunken">Inloggen</Link>
                  <Link href="/aanmelden" className="block rounded-lg px-3 py-2.5 hover:bg-sunken">Account maken</Link>
                </>
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
