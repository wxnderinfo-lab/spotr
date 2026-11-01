"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { LiveCount } from "./live/LiveProvider";

const badge = "absolute -top-1.5 -right-2.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white";

// Onderbalk op mobiel, zoals in Spotr: de vijf belangrijkste plekken.
const items = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/opdrachten", label: "Werk", icon: Search },
  { href: "/opdracht-plaatsen", label: "Plaatsen", icon: Plus },
  { href: "/berichten", label: "Berichten", icon: MessageSquare },
  { href: "/account", label: "Account", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/berichten/")) return null; // chat heeft eigen invoerbalk
  return (
    <nav aria-label="Snelmenu" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`}
              >
                <span className="relative">
                  <Icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} aria-hidden />
                  {href === "/berichten" && <LiveCount kind="messages" fallback={0} label="ongelezen berichten" className={badge} />}
                  {href === "/account" && <LiveCount kind="notifications" fallback={0} label="nieuwe meldingen" className={badge} />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
