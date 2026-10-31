"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { addPortfolioItem, setAvatar } from "@/actions/account";
import { publicUrl } from "@/lib/storage";
import { ImageUpload } from "./ImageUpload";
import { FormMessage, SubmitButton, type FormState } from "./forms";
import { Avatar } from "./ui";

export function AvatarEditor({ userId, path, name }: { userId: string; path: string | null; name: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-4">
      <Avatar src={publicUrl("avatars", path)} name={name} size={72} />
      <div className="flex flex-wrap gap-2">
        <ImageUpload bucket="avatars" userId={userId} maxSide={400} label={path ? "Andere foto" : "Profielfoto uploaden"} onUploaded={async (p) => { await setAvatar(p); router.refresh(); }} />
        {path && <button type="button" className="btn-ghost" onClick={async () => { await setAvatar(null); router.refresh(); }}>Verwijderen</button>}
      </div>
    </div>
  );
}

export function PortfolioAdd({ userId }: { userId: string }) {
  const [imagePath, setImagePath] = useState("");
  const [state, action] = useActionState<FormState, FormData>(async (s, fd) => {
    const res = await addPortfolioItem(s, fd);
    if (res?.ok) setImagePath("");
    return res;
  }, null);
  return (
    <form action={action} className="card space-y-3 p-4">
      <p className="font-semibold">Werk toevoegen</p>
      <input type="hidden" name="image_path" value={imagePath} />
      <div className="flex flex-wrap items-center gap-3">
        {imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicUrl("portfolio", imagePath) ?? ""} alt="" className="h-20 w-28 rounded-lg object-cover" />
        ) : null}
        <ImageUpload bucket="portfolio" userId={userId} label={imagePath ? "Andere foto" : "Foto kiezen"} onUploaded={(p) => setImagePath(p)} />
      </div>
      <div>
        <label htmlFor="pf-video" className="label">Of een videolink <span className="font-normal text-muted">(YouTube of Vimeo)</span></label>
        <input id="pf-video" name="video_url" type="url" className="input" placeholder="https://www.youtube.com/watch?v=…" />
      </div>
      <div>
        <label htmlFor="pf-title" className="label">Titel</label>
        <input id="pf-title" name="title" required maxLength={100} className="input" />
      </div>
      <div>
        <label htmlFor="pf-desc" className="label">Korte toelichting <span className="font-normal text-muted">(optioneel)</span></label>
        <textarea id="pf-desc" name="description" rows={2} maxLength={1000} className="input" />
      </div>
      <p className="text-xs text-muted">Alleen eigen werk, en zonder herkenbare personen tenzij zij toestemming gaven.</p>
      <FormMessage state={state} />
      <SubmitButton className="btn-secondary">Toevoegen</SubmitButton>
    </form>
  );
}
