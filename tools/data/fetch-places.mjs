// Haalt alle woonplaatsen (BAG) met middelpunt op uit de PDOK Locatieserver
// en schrijft een SQL-seedmigratie. Eenmalig gedraaid op 2026-10-31.
// Bron: https://api.pdok.nl/bzk/locatieserver/search/v3_1/ (open data, CC0/PDOK).
import { writeFileSync } from "node:fs";
const base = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=*:*&fq=type:woonplaats&fl=woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll&rows=100&sort=woonplaatsnaam%20asc";
const rows = [];
for (let start = 0; ; start += 100) {
  const r = await fetch(`${base}&start=${start}`);
  const j = await r.json();
  rows.push(...j.response.docs);
  if (start + 100 >= j.response.numFound) break;
}
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const seen = new Map();
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const values = [];
for (const d of rows) {
  const m = /POINT\(([-0-9.]+) ([-0-9.]+)\)/.exec(d.centroide_ll);
  if (!m) continue;
  let slug = slugify(d.woonplaatsnaam);
  // dubbele woonplaatsnamen (bijv. Hengelo): gemeente erbij
  if (rows.filter((x) => slugify(x.woonplaatsnaam) === slug).length > 1) slug = `${slug}-${slugify(d.gemeentenaam)}`;
  if (seen.has(slug)) continue;
  seen.set(slug, true);
  values.push(`(${q(d.woonplaatsnaam)}, ${q(slug)}, ${q(d.gemeentenaam)}, ${q(d.provincienaam)}, ${Number(m[2]).toFixed(5)}, ${Number(m[1]).toFixed(5)})`);
}
const sql = `-- Woonplaatsen uit de Basisregistratie Adressen en Gebouwen (BAG), via de
-- PDOK Locatieserver, opgehaald op 2026-10-31 met tools/data/fetch-places.mjs.
-- ${values.length} woonplaatsen. Alleen naam, gemeente, provincie en middelpunt.
INSERT INTO public.places (name, slug, municipality, province, lat, lng) VALUES
${values.join(",\n")}
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, municipality = EXCLUDED.municipality, province = EXCLUDED.province,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng;
`;
writeFileSync(process.argv[2], sql);
console.log(values.length, "woonplaatsen");
