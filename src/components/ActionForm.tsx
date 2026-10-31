"use client";
import { useActionState, type ReactNode } from "react";
import { FormMessage, type FormState } from "./forms";

/**
 * Formulier rond een server action met nette fout- en succesmeldingen.
 * Werkt ook zonder JavaScript (progressive enhancement).
 */
export function ActionForm({
  action,
  children,
  className,
  hideOnSuccess = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode | ((state: FormState) => ReactNode);
  className?: string;
  hideOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  if (hideOnSuccess && state?.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className={className}>
      {typeof children === "function" ? children(state) : children}
      <div className="mt-3 empty:hidden" aria-live="polite">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
