"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addJobAttachment } from "@/actions/jobs";
import { ImageUpload } from "./ImageUpload";

export function JobPhotoUpload({ jobId, userId, count }: { jobId: string; userId: string; count: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  if (count >= 8) return <p className="text-sm text-muted">Maximaal 8 foto&apos;s.</p>;
  return (
    <div>
      <ImageUpload
        bucket="job-media"
        userId={userId}
        label="Foto toevoegen"
        onUploaded={async (path) => {
          const res = await addJobAttachment(jobId, path);
          if (res?.error) setError(res.error);
          else router.refresh();
        }}
      />
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <p className="hint">Foto&apos;s zijn openbaar bij je opdracht. We halen locatiegegevens uit de foto. Zorg dat er geen huisnummer of personen op staan.</p>
    </div>
  );
}
