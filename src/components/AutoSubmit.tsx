"use client";
import { useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Filterformulier dat met JavaScript direct bijwerkt bij een wijziging en
 * zonder JavaScript gewoon met de knop werkt (GET-formulier).
 */
export function AutoSubmitForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submit = () => {
    const form = ref.current;
    if (!form) return;
    const params = new URLSearchParams();
    new FormData(form).forEach((v, k) => {
      if (typeof v === "string" && v.trim() !== "" && k !== "pagina") params.set(k, v);
    });
    const qs = params.toString();
    router.replace(`${action}${qs ? `?${qs}` : ""}`, { scroll: false });
  };
  return (
    <form
      ref={ref}
      action={action}
      method="get"
      className={className}
      onChange={(e) => {
        // tekstvelden pas bij verzenden, keuzes direct
        const t = e.target as HTMLElement;
        if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && (t.type === "checkbox" || t.type === "radio" || t.type === "hidden"))) submit();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {children}
    </form>
  );
}
