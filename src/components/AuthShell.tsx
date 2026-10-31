import type { ReactNode } from "react";

export function AuthShell({ title, intro, children, aside }: { title: string; intro?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_22rem]">
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {intro && <div className="mt-2 text-ink-soft">{intro}</div>}
        <div className="mt-6">{children}</div>
      </div>
      {aside && <aside className="card h-fit p-6 text-sm text-ink-soft">{aside}</aside>}
    </div>
  );
}
