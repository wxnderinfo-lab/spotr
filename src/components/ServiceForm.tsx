"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addService } from "@/actions/account";
import { publicUrl } from "@/lib/storage";
import { ImageUpload } from "./ImageUpload";
import { FormMessage, SubmitButton, type FormState } from "./forms";

type Tree = { id: number; name: string; children: { id: number; name: string }[] }[];

const DEFAULT_NAMES = ["Basis", "Plus", "Compleet"];

/**
 * Dienst toevoegen: titel, wat de klant krijgt, een omslagfoto en óf één
 * prijs óf maximaal drie pakketten.
 */
export function ServiceForm({ userId, tree }: { userId: string; tree: Tree }) {
  const [cover, setCover] = useState("");
  const [mode, setMode] = useState<"prijs" | "pakketten">("prijs");
  const [count, setCount] = useState(2);
  const [state, action] = useActionState<FormState, FormData>(async (s, fd) => {
    const res = await addService(s, fd);
    if (res?.ok) {
      setCover("");
      setMode("prijs");
      setCount(2);
    }
    return res;
  }, null);

  return (
    <form action={action} className="card space-y-5 p-5 sm:p-6">
      <div>
        <p className="font-bold">Nieuwe dienst</p>
        <p className="text-sm text-ink-soft">Een vast aanbod met een duidelijke prijs, zoals ‘Woonkamer schilderen’ of ‘Logo met 2 correctierondes’.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-[16rem_1fr]">
        <div>
          <span className="label">Omslagfoto</span>
          <input type="hidden" name="cover_path" value={cover} />
          <div className="relative mb-2 aspect-[16/10] overflow-hidden rounded-xl border border-dashed border-line-strong bg-sunken">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicUrl("portfolio", cover) ?? ""} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full place-items-center px-4 text-center text-sm text-muted">Eigen werk werkt het best. Zonder foto tonen we de categoriefoto.</span>
            )}
          </div>
          <div className="flex gap-2">
            <ImageUpload bucket="portfolio" userId={userId} label={cover ? "Andere foto" : "Foto kiezen"} onUploaded={(p) => setCover(p)} />
            {cover && <button type="button" className="btn-ghost" onClick={() => setCover("")}>Weghalen</button>}
          </div>
        </div>

        <div className="grid gap-4">
          <div><label htmlFor="sv-title" className="label">Titel</label><input id="sv-title" name="title" required minLength={8} maxLength={90} className="input" placeholder="Bijv. Woonkamer schilderen, muren en plafond" /></div>
          <div><label htmlFor="sv-cat" className="label">Categorie</label><select id="sv-cat" name="category_id" required className="input"><option value="">Kies…</option>{tree.map((pa) => <optgroup key={pa.id} label={pa.name}>{pa.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></div>
          <div><label htmlFor="sv-desc" className="label">Wat krijgt de klant?</label><textarea id="sv-desc" name="description" required minLength={40} maxLength={5000} rows={4} className="input" /><p className="hint">Wat zit erbij, wat niet, en wat heb je van de klant nodig?</p></div>
        </div>
      </div>

      <fieldset>
        <legend className="label">Prijs</legend>
        <div className="inline-flex rounded-xl border border-line bg-sunken p-1 text-sm font-semibold" role="radiogroup">
          {(["prijs", "pakketten"] as const).map((m) => (
            <label key={m} className={`cursor-pointer rounded-lg px-4 py-2 ${mode === m ? "bg-surface shadow-sm" : "text-muted"}`}>
              <input type="radio" name="_prijsvorm" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {m === "prijs" ? "Eén prijs" : "Pakketten (max. 3)"}
            </label>
          ))}
        </div>

        {mode === "prijs" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="sv-pt" className="label">Soort prijs</label><select id="sv-pt" name="price_type" className="input"><option value="vast">Vaste prijs</option><option value="vanaf">Vanaf</option><option value="uur">Per uur</option><option value="op_aanvraag">Op aanvraag</option></select></div>
            <div><label htmlFor="sv-price" className="label">Bedrag (€)</label><input id="sv-price" name="price" inputMode="decimal" className="input" /></div>
          </div>
        ) : (
          <div className="mt-4">
            <input type="hidden" name="price_type" value="vanaf" />
            <ol className="grid gap-3 lg:grid-cols-3">
              {Array.from({ length: count }, (_, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface p-4">
                  <div className="grid gap-3">
                    <div><label htmlFor={`pk-n-${i}`} className="label">Naam</label><input id={`pk-n-${i}`} name={`pkg_name_${i}`} defaultValue={DEFAULT_NAMES[i]} required maxLength={40} className="input" /></div>
                    <div><label htmlFor={`pk-p-${i}`} className="label">Prijs (€)</label><input id={`pk-p-${i}`} name={`pkg_price_${i}`} required inputMode="decimal" className="input" /></div>
                    <div><label htmlFor={`pk-d-${i}`} className="label">Wat zit erin</label><textarea id={`pk-d-${i}`} name={`pkg_desc_${i}`} rows={2} maxLength={300} className="input" /></div>
                    <div><label htmlFor={`pk-t-${i}`} className="label">Levertijd <span className="font-normal text-muted">(optioneel)</span></label><input id={`pk-t-${i}`} name={`pkg_delivery_${i}`} maxLength={60} className="input" placeholder="Bijv. 2 werkdagen" /></div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex gap-2">
              {count < 3 && <button type="button" className="btn-ghost" onClick={() => setCount(count + 1)}><Plus className="h-4 w-4" aria-hidden /> Pakket toevoegen</button>}
              {count > 1 && <button type="button" className="btn-ghost" onClick={() => setCount(count - 1)}><Trash2 className="h-4 w-4" aria-hidden /> Laatste weghalen</button>}
            </div>
            <p className="hint">De dienst toont ‘vanaf’ de prijs van je goedkoopste pakket.</p>
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="sv-mode" className="label">Waar</label><select id="sv-mode" name="work_mode" className="input"><option value="op_locatie">Op locatie</option><option value="online">Online</option><option value="beide">Allebei</option></select></div>
        <div><label htmlFor="sv-del" className="label">Levertijd of duur <span className="font-normal text-muted">(optioneel)</span></label><input id="sv-del" name="delivery_note" maxLength={120} className="input" placeholder="Bijv. binnen 5 werkdagen" /></div>
      </div>

      <FormMessage state={state} />
      <SubmitButton>Dienst publiceren</SubmitButton>
    </form>
  );
}
