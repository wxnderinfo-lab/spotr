"use client";
import { useId, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/image";

/** Uploadt een verkleinde WebP naar <bucket>/<userId>/<uuid>.webp en geeft het pad terug. */
export function ImageUpload({ bucket, userId, maxSide = 1600, label = "Foto kiezen", onUploaded }: {
  bucket: "avatars" | "portfolio" | "job-media"; userId: string; maxSide?: number; label?: string; onUploaded: (path: string) => void | Promise<void>;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <label htmlFor={id} className={`btn-secondary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
        {busy ? "Uploaden…" : label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError(null);
          setBusy(true);
          try {
            const blob = await prepareImage(file, maxSide);
            const path = `${userId}/${crypto.randomUUID()}.webp`;
            const { error: upErr } = await createClient().storage.from(bucket).upload(path, blob, { contentType: "image/webp", upsert: false });
            if (upErr) throw new Error("Uploaden lukte niet. Probeer een kleinere foto.");
            await onUploaded(path);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
