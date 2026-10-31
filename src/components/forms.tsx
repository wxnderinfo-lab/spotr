"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type FormState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

export function SubmitButton({ children, className = "btn-primary", pendingText = "Bezig…" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-ink">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm font-medium text-ink">
        {state.message}
      </p>
    );
  return null;
}
