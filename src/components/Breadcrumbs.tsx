import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { site } from "@/config/site";
import { JsonLd } from "./JsonLd";

export type Crumb = { name: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Kruimelpad" className="mb-4 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
              {c.href && i < all.length - 1 ? (
                <Link href={c.href} className="hover:text-ink hover:underline">{c.name}</Link>
              ) : (
                <span aria-current={i === all.length - 1 ? "page" : undefined} className="text-ink-soft">{c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            ...(c.href ? { item: `${site.url}${c.href}` } : {}),
          })),
        }}
      />
    </>
  );
}
