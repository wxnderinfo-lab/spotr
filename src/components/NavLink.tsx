"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Menu-item dat laat zien waar je bent (aria-current + onderstreping).
export function NavLink({ href, children, className = "", exact = false }: { href: string; children: ReactNode; className?: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sunken ${active ? "text-ink underline decoration-accent decoration-2 underline-offset-[6px]" : "text-ink-soft"} ${className}`}
    >
      {children}
    </Link>
  );
}
