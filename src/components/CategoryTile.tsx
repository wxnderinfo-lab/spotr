import Link from "next/link";
import Image from "next/image";
import { MapPin, Monitor } from "lucide-react";
import { photoFor } from "@/config/photos";

/** Hoofdcategorie als fototegel (homepage en /categorieen). */
export function CategoryTile({ c }: { c: { slug: string; name: string; work_mode: string; children: { name: string }[] } }) {
  const photo = photoFor(c.slug);
  return (
    <Link href={`/categorieen/${c.slug}`} className="group card flex h-full flex-col overflow-hidden hover:border-line-strong">
      <span className="relative block aspect-[4/3] bg-sunken">
        {photo && <Image src={photo.src} alt="" fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />}
      </span>
      <span className="flex flex-1 flex-col p-4">
        <span className="flex items-center gap-2 font-semibold">
          {c.work_mode === "online" ? <Monitor className="h-4 w-4 text-accent" aria-hidden /> : <MapPin className="h-4 w-4 text-accent" aria-hidden />}
          {c.name}
        </span>
        <span className="mt-1 text-sm text-muted">{c.children.slice(0, 3).map((s) => s.name).join(", ")}</span>
      </span>
    </Link>
  );
}
