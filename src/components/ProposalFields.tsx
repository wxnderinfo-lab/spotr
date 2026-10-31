"use client";
import { useState } from "react";

export function ProposalFields({ budgetType, portfolio }: { budgetType: string; portfolio: { id: string; title: string }[] }) {
  const [priceType, setPriceType] = useState(budgetType === "uur" ? "uur" : "vast");
  return (
    <>
      <fieldset>
        <legend className="label">Prijs</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="price_type" value="vast" checked={priceType === "vast"} onChange={() => setPriceType("vast")} className="h-4 w-4 accent-[var(--color-accent)]" /> Vaste prijs</label>
          <label className="flex items-center gap-2"><input type="radio" name="price_type" value="uur" checked={priceType === "uur"} onChange={() => setPriceType("uur")} className="h-4 w-4 accent-[var(--color-accent)]" /> Per uur</label>
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="p-amount" className="label">{priceType === "uur" ? "Uurtarief (€)" : "Totaalprijs (€)"}</label>
          <input id="p-amount" name="amount" inputMode="decimal" required className="input" placeholder="0" />
        </div>
        {priceType === "uur" && (
          <div>
            <label htmlFor="p-hours" className="label">Geschat aantal uur</label>
            <input id="p-hours" name="hours" inputMode="decimal" className="input" />
          </div>
        )}
      </div>
      <p className="-mt-2 text-xs text-muted">Bedragen inclusief btw als je die rekent. Je spreekt de betaling zelf af met de opdrachtgever.</p>
      <div>
        <label htmlFor="p-msg" className="label">Waarom jij?</label>
        <textarea id="p-msg" name="message" rows={5} minLength={30} maxLength={3000} required className="input" aria-describedby="p-msg-hint" />
        <p id="p-msg-hint" className="hint">Vertel wat je gaat doen, je ervaring en wat er bij de prijs inbegrepen is. Geen contactgegevens.</p>
      </div>
      <div>
        <label htmlFor="p-plan" className="label">Planning <span className="font-normal text-muted">(optioneel)</span></label>
        <input id="p-plan" name="planning" maxLength={600} className="input" placeholder="Bijv. 2 dagen, start volgende week" />
      </div>
      <div>
        <label htmlFor="p-from" className="label">Beschikbaar vanaf <span className="font-normal text-muted">(optioneel)</span></label>
        <input id="p-from" name="available_from" type="date" className="input" />
      </div>
      {portfolio.length > 0 && (
        <fieldset>
          <legend className="label">Portfolio meesturen <span className="font-normal text-muted">(max. 6)</span></legend>
          <div className="max-h-40 space-y-1.5 overflow-auto text-sm">
            {portfolio.map((p) => (
              <label key={p.id} className="flex items-center gap-2"><input type="checkbox" name="portfolio" value={p.id} className="h-4 w-4 accent-[var(--color-accent)]" /> {p.title}</label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}
