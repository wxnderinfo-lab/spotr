// End-to-end-test van Jobmarkt via de echte schermen (Chrome, headless).
// Vooraf: `node tools/local-supabase/server.mjs` (schone database) en
// `node tools/local-supabase/next-local.mjs start` (productiebuild).
// Elke gebruiker heeft een eigen browsercontext (eigen cookies).
import puppeteer from "puppeteer-core";
import Stripe from "stripe";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const shots = join(here, ".run", "shots");
mkdirSync(shots, { recursive: true });
const env = Object.fromEntries(readFileSync(join(root, ".env.localtest"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const APP = process.env.APP_URL ?? "http://localhost:3100";
const GW = env.NEXT_PUBLIC_SUPABASE_URL;
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

let passed = 0;
const failures = [];
const ok = (cond, name) => {
  if (cond) passed++;
  else failures.push(name);
  console.log(`${cond ? "  ok  " : "  FAIL"} ${name}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = Date.now().toString(36);
const yearsAgo = (y) => { const d = new Date(); d.setFullYear(d.getFullYear() - y); d.setDate(d.getDate() - 3); return d.toISOString().slice(0, 10); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--lang=nl-NL"] });

async function newUser(label, { mobile = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 900 });
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => console.log(`    [${label} pageerror] ${e.message.slice(0, 160)}`));
  return { ctx, page, label };
}
const go = (page, path) => page.goto(APP + path, { waitUntil: "networkidle0" });
async function shot(page, name) {
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true });
}
async function setValue(page, selector, value) {
  await page.$eval(selector, (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
// Knoppen activeren via het element zelf: op mobiel kan de vaste onderbalk
// over het klikpunt liggen.
async function submitAndWait(page, selector) {
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => null), page.$eval(selector, (b) => b.click())]);
}
async function clickByText(page, label) {
  const found = await page.$$eval("button", (bs, l) => bs.some((b) => b.textContent.trim() === l), label);
  if (!found) throw new Error(`knop "${label}" niet gevonden op ${page.url()}`);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 8000 }).catch(() => null),
    page.$$eval("button", (bs, l) => bs.find((b) => b.textContent.trim() === l).click(), label),
  ]);
}
const text = (page) => page.evaluate(() => document.body.innerText);
async function waitForText(page, needle, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await text(page)).includes(needle)) return true;
    await sleep(250);
  }
  return false;
}
async function mailLink(email, type = "signup") {
  for (let i = 0; i < 40; i++) {
    const r = await (await fetch(`${GW}/_mailbox?to=${encodeURIComponent(email)}`)).json();
    const m = r.filter((x) => x.type === type).pop();
    if (m) return m.link;
    await sleep(250);
  }
  throw new Error(`geen mail voor ${email}`);
}

async function signUp(u, { name, email, birthdate, role, username, next = "" }) {
  const qs = new URLSearchParams();
  if (role === "professional") qs.set("rol", "professional");
  if (next) qs.set("volgende", next);
  await go(u.page, `/aanmelden${qs.size ? `?${qs}` : ""}`);
  await u.page.type("#display_name", name);
  await u.page.type("#email", email);
  await u.page.type("#password", "Test-wachtwoord-1");
  await u.page.$eval('input[name="akkoord"]', (e) => e.click());
  await submitAndWait(u.page, 'button[type="submit"]');
  ok(u.page.url().includes("/aanmelden/controleer-je-mail"), `${u.label}: na aanmelden 'controleer je mail'`);
  const link = await mailLink(email);
  await go(u.page, link.replace(/^https?:\/\/[^/]+/, ""));
  ok(u.page.url().includes("/welkom"), `${u.label}: bevestigingslink logt in en opent onboarding`);
  await u.page.$eval("#username", (el) => (el.value = ""));
  await u.page.type("#username", username);
  await setValue(u.page, "#birthdate", birthdate);
  await u.page.$eval(`input[name="rol"][value="${role}"]`, (e) => e.click());
  await u.page.$eval('input[name="akkoord"]', (e) => e.click());
  await submitAndWait(u.page, 'button[type="submit"]');
  if (u.page.url().includes("/welkom")) {
    const body = (await text(u.page)).slice(0, 600).split("\n").join(" ");
    console.log(`    [${u.label}] onboarding bleef staan: ${body}`);
  }
}

async function login(u, email, password) {
  await go(u.page, "/inloggen");
  await u.page.type("#email", email);
  await u.page.type("#password", password);
  await submitAndWait(u.page, 'button[type="submit"]');
}

async function tokenFor(email) {
  const r = await fetch(`${GW}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Test-wachtwoord-1" }) });
  return (await r.json()).access_token;
}
async function rest(token, path, init = {}) {
  const r = await fetch(`${GW}/rest/v1/${path}`, { ...init, headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const body = await r.text();
  return { status: r.status, data: body ? JSON.parse(body) : null };
}
const subOf = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url")).sub;

try {
  // ── 0. Rondkijken zonder account en zonder JavaScript ─────────────────
  console.log("\n0. Openbare pagina's");
  {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.setJavaScriptEnabled(false);
    for (const path of ["/", "/opdrachten", "/professionals", "/categorieen/klussen-en-bouw", "/kennisbank/budget-bepalen-voor-een-klus", "/hoe-het-werkt", "/prijzen"]) {
      const res = await p.goto(APP + path);
      const h1 = await p.$eval("h1", (e) => e.textContent).catch(() => null);
      ok(res.status() === 200 && !!h1, `zonder JavaScript: ${path} geeft 200 en een h1 (“${(h1 ?? "").slice(0, 40)}”)`);
    }
    await p.goto(APP + "/opdrachten?waar=online&sorteer=nieuw");
    ok((await p.$eval('select[name="waar"]', (e) => e.value)) === "online", "zonder JavaScript: filters werken als gewoon formulier");
    await ctx.close();
  }

  // ── 1. Opdrachtgever: opdracht beginnen, aanmelden, concept terug, plaatsen
  console.log("\n1. Opdrachtgever plaatst een opdracht");
  const client = await newUser("opdrachtgever", { mobile: true });
  await go(client.page, "/opdracht-plaatsen");
  const schilderValue = await client.page.$$eval("#category option", (os) => os.find((o) => o.textContent === "Schilderen & behangen")?.value);
  await client.page.select("#category", schilderValue);
  await client.page.type("#title", "Woonkamer en gang schilderen in Almere");
  await client.page.type("#description", "Wanden en plafond van de woonkamer (ongeveer 35 m2) en de gang wit schilderen. Verf is aanwezig, kozijnen blijven zoals ze zijn.");
  await client.page.type("#place", "Almer");
  await client.page.waitForSelector('[role="option"]');
  await client.page.click('[role="option"]');
  await client.page.type("#budget_max", "650");
  ok((await text(client.page)).includes("Maak een gratis account"), "zonder account: vraag om aanmelden pas bij plaatsen");
  await shot(client.page, "01-opdracht-concept-mobiel");
  const clientEmail = `opdrachtgever-${run}@test.local`;
  await signUp(client, { name: "Sanne de Opdrachtgever", email: clientEmail, birthdate: yearsAgo(34), role: "opdrachtgever", username: `sanne-${run}`, next: "/opdracht-plaatsen" });
  ok(client.page.url().includes("/opdracht-plaatsen"), `na onboarding terug bij opdracht plaatsen (${client.page.url().replace(APP, "")})`);
  if (!client.page.url().includes("/opdracht-plaatsen")) await go(client.page, "/opdracht-plaatsen");
  ok((await client.page.$eval("#title", (e) => e.value)) === "Woonkamer en gang schilderen in Almere", "begonnen opdracht is na aanmelden bewaard gebleven");
  await submitAndWait(client.page, "form button[type=submit]");
  ok(client.page.url().includes("/account/opdrachten/"), "concept opgeslagen, voorbeeld getoond vóór publicatie");
  ok(await waitForText(client.page, "Zo ziet je opdracht eruit"), "voorbeeldstap zichtbaar");
  const jobId = client.page.url().split("/account/opdrachten/")[1].split("?")[0];
  await clickByText(client.page, "Publiceren");
  ok(await waitForText(client.page, "Je opdracht staat online"), "opdracht gepubliceerd");
  const jobUrl = await client.page.$$eval("a", (as) => as.find((a) => a.textContent.includes("Openbare pagina"))?.getAttribute("href"));
  ok(/^\/opdrachten\/.+-[0-9a-f]{8}$/.test(jobUrl ?? ""), `nette, canonieke opdracht-URL (${jobUrl})`);

  // ── 2. Professionals maken een profiel en reageren ───────────────────
  console.log("\n2. Professionals reageren");
  const pro = await newUser("professional");
  const proEmail = `pro-${run}@test.local`;
  await signUp(pro, { name: "Daan Schilder", email: proEmail, birthdate: yearsAgo(29), role: "professional", username: `daan-${run}` });
  ok(pro.page.url().includes("/account/profiel"), "professional gaat na onboarding naar profiel");
  await pro.page.type("#headline", "Schilder met acht jaar ervaring");
  await pro.page.type("#bio", "Ik schilder binnen en buiten, werk netjes met afplakken en afdekken en ruim altijd zelf op. Vooral in Flevoland en het Gooi.");
  await pro.page.type("#skills", "binnenschilderwerk, behangen");
  await pro.page.type("#pr-plaats", "Almere");
  await pro.page.waitForSelector('[role="option"]');
  await pro.page.click('[role="option"]');
  await pro.page.type("#hourly_rate", "42");
  await submitAndWait(pro.page, 'form:has(#bio) button[type="submit"]');
  ok(await waitForText(pro.page, "Profiel opgeslagen"), "profiel opgeslagen");
  const klusId = await pro.page.$$eval('input[name="categorie"]', (els) => els.find((e) => e.closest("label")?.textContent?.includes("Klussen & bouw"))?.value);
  await pro.page.click(`input[name="categorie"][value="${klusId}"]`);
  await submitAndWait(pro.page, '#categorieen button[type="submit"]');
  ok(await waitForText(pro.page, "Categorieën opgeslagen"), "categorieën opgeslagen");
  await pro.page.type("#pf-video", "https://www.youtube.com/watch?v=abcdefghijk");
  await pro.page.type("#pf-title", "Trappenhuis Almere Haven");
  await submitAndWait(pro.page, '#portfolio button[type="submit"]');
  ok(await waitForText(pro.page, "Toegevoegd aan je portfolio"), "portfolio-item met videolink toegevoegd");

  await go(pro.page, jobUrl);
  await pro.page.type("#vraag", "Mag ik even bellen? 06-12345678");
  await submitAndWait(pro.page, '#vragen > form button[type="submit"]');
  ok(await waitForText(pro.page, "Deel geen telefoonnummers"), "vraag met telefoonnummer geweigerd");
  await pro.page.$eval("#vraag", (e) => (e.value = ""));
  await pro.page.type("#vraag", "Moeten de plafonds ook in twee lagen?");
  await submitAndWait(pro.page, '#vragen > form button[type="submit"]');
  ok(await waitForText(pro.page, "Je vraag is geplaatst"), "vraag zonder contactgegevens geplaatst");
  await go(pro.page, jobUrl);
  await pro.page.type("#p-amount", "560");
  await pro.page.type("#p-msg", "Ik doe dit in twee dagen, inclusief afplakken, twee lagen op de wanden en een laag op het plafond. Materiaal gebruik ik van u.");
  await pro.page.type("#p-plan", "2 dagen, volgende week");
  await clickByText(pro.page, "Voorstel versturen");
  ok(await waitForText(pro.page, "Je hebt gereageerd"), "professional verstuurt voorstel (pagina toont ‘Je hebt gereageerd’)");
  await shot(pro.page, "02-voorstel-verstuurd");

  const pro2 = await newUser("tweede professional");
  const pro2Email = `pro2-${run}@test.local`;
  await signUp(pro2, { name: "Lotte Klus", email: pro2Email, birthdate: yearsAgo(41), role: "professional", username: `lotte-${run}` });
  const klusId2 = await pro2.page.$$eval('input[name="categorie"]', (els) => els.find((e) => e.closest("label")?.textContent?.includes("Klussen & bouw"))?.value);
  await pro2.page.click(`input[name="categorie"][value="${klusId2}"]`);
  await submitAndWait(pro2.page, '#categorieen button[type="submit"]');
  await go(pro2.page, jobUrl);
  ok((await text(pro2.page)).includes("0 van 5 gratis voorstellen"), "gratis account ziet maandlimiet (0 van 5)");
  await pro2.page.type("#p-amount", "720");
  await pro2.page.type("#p-msg", "Ervaren klusbedrijf, ik kan morgen al beginnen en neem eigen afdekmateriaal mee voor de vloer.");
  await clickByText(pro2.page, "Voorstel versturen");
  ok(await waitForText(pro2.page, "Je hebt gereageerd"), "tweede professional verstuurt voorstel");

  // ── 3. Opdrachtgever beantwoordt, vergelijkt en accepteert ───────────
  console.log("\n3. Vergelijken en accepteren");
  await go(client.page, jobUrl);
  await client.page.type('input[name="answer"]', "Ja graag, twee lagen.");
  await clickByText(client.page, "Beantwoorden");
  ok(await waitForText(client.page, "Ja graag, twee lagen."), "opdrachtgever beantwoordt vraag openbaar");
  await client.page.setViewport({ width: 1280, height: 900 });
  await go(client.page, `/account/opdrachten/${jobId}`);
  ok((await client.page.$$("table caption")).length === 1 && (await text(client.page)).includes("Voorstellen (2)"), "twee voorstellen naast elkaar te vergelijken");
  await shot(client.page, "03-voorstellen-vergelijken");
  const [acceptForm] = await client.page.$$("li[id^='v-'] form");
  await acceptForm.$eval('input[type="checkbox"]', (e) => e.click());
  await Promise.all([client.page.waitForNavigation({ waitUntil: "networkidle0" }), acceptForm.$eval('button[type="submit"]', (b) => b.click())]);
  ok(client.page.url().includes("/berichten/"), "na accepteren direct in het privégesprek");
  const convPath = new URL(client.page.url()).pathname;

  // ── 4. Chat en vrijwillig contact delen ──────────────────────────────
  console.log("\n4. Gesprek en contact");
  await client.page.waitForFunction(() => document.querySelector("#bericht") && !document.querySelector("#bericht").disabled);
  await client.page.type("#bericht", "Fijn! Dinsdag om 9 uur past mij goed.");
  await client.page.waitForFunction(() => !document.querySelector('button[aria-label="Versturen"]').disabled);
  await client.page.$eval('button[aria-label="Versturen"]', (b) => b.click());
  ok(await waitForText(client.page, "Dinsdag om 9 uur"), "opdrachtgever stuurt bericht");
  await go(pro.page, convPath);
  ok(await waitForText(pro.page, "Dinsdag om 9 uur"), "professional ziet het bericht");
  await pro.page.type("#phone", "06 12345678");
  await clickByText(pro.page, "Nummer delen");
  ok(await waitForText(pro.page, "Je deelt 0612345678"), "professional deelt vrijwillig telefoonnummer");
  await pro.page.type("#bericht", "Top, tot dinsdag!");
  await pro.page.click('button[aria-label="Versturen"]');
  await sleep(500);
  await go(client.page, convPath);
  const tel = await client.page.$eval('a[href^="tel:"]', (a) => a.getAttribute("href")).catch(() => null);
  ok(tel === "tel:+31612345678", "opdrachtgever krijgt belknop (tel:-link) met gedeeld nummer");
  ok(await waitForText(client.page, "Top, tot dinsdag!"), "berichten komen binnen (realtime of periodiek ophalen)");
  await shot(client.page, "04-gesprek");
  const res404 = await pro2.page.goto(APP + convPath);
  ok(res404.status() === 404, "afgewezen professional krijgt 404 op het gesprek");
  await go(pro2.page, "/account/meldingen");
  ok((await text(pro2.page)).includes("Opdracht is aan iemand anders gegeven"), "afgewezen professional krijgt nette melding");

  // ── 5. Uitvoeren, opleveren, afronden ────────────────────────────────
  console.log("\n5. Statusmodel");
  await go(pro.page, `/account/opdrachten/${jobId}`);
  await clickByText(pro.page, "Ik ben begonnen");
  await go(pro.page, `/account/opdrachten/${jobId}`);
  ok((await text(pro.page)).includes("Markeer als opgeleverd"), "status 'bezig' na start door professional");
  await clickByText(pro.page, "Markeer als opgeleverd");
  await go(client.page, `/account/opdrachten/${jobId}`);
  ok((await text(client.page)).includes("Goedkeuren en afronden"), "opdrachtgever kan opgeleverd werk goedkeuren");
  await clickByText(client.page, "Goedkeuren en afronden");
  await go(client.page, `/account/opdrachten/${jobId}`);
  ok((await text(client.page)).includes("Beoordeel"), "na afronden kan opdrachtgever beoordelen");

  // ── 6. Beoordelingen, dubbelblind ────────────────────────────────────
  console.log("\n6. Beoordelingen");
  for (const [name, v] of [["rating", 5], ["communication", 5], ["quality", 4], ["reliability", 5]]) {
    await client.page.$eval(`input[name="${name}"][value="${v}"]`, (e) => e.click());
  }
  await client.page.type("#body", "Netjes en snel gewerkt, alles goed afgeplakt.");
  await clickByText(client.page, "Beoordeling plaatsen");
  ok(await waitForText(client.page, "Je hebt deze opdracht beoordeeld"), "opdrachtgever plaatst beoordeling");
  await go(pro.page, `/professionals/daan-${run}`);
  ok((await text(pro.page)).includes("Nog geen beoordelingen"), "dubbelblind: beoordeling nog niet openbaar");
  const r404 = await pro2.page.goto(`${APP}/account/opdrachten/${jobId}`);
  ok(r404.status() === 404, "afgewezen professional kan opdracht niet beheren of beoordelen");
  await go(pro.page, `/account/opdrachten/${jobId}`);
  await pro.page.$eval('input[name="rating"][value="5"]', (e) => e.click());
  await pro.page.type("#body", "Duidelijke opdracht en prettig contact.");
  await clickByText(pro.page, "Beoordeling plaatsen");
  await go(pro.page, `/professionals/daan-${run}`);
  ok((await text(pro.page)).includes("5 van 5") && (await text(pro.page)).includes("Geverifieerde opdracht"), "na beide beoordelingen openbaar, gekoppeld aan geverifieerde opdracht");
  await shot(pro.page, "06-profiel-met-beoordeling");

  // ── 7. Derde account kan niets privés lezen (via de API) ─────────────
  console.log("\n7. Afscherming");
  const t2 = await tokenFor(pro2Email);
  const convId = convPath.split("/").pop();
  ok((await rest(t2, `messages?conversation_id=eq.${convId}&select=id`)).data.length === 0, "derde leest geen berichten via de API");
  ok((await rest(t2, `contact_shares?select=phone`)).data.length === 0, "derde leest geen gedeelde nummers via de API");
  const ownProps = await rest(t2, `proposals?job_id=eq.${jobId}&select=id,provider_id`);
  ok(ownProps.data.length === 1 && ownProps.data[0].provider_id === subOf(t2), "derde ziet alleen eigen voorstel");
  const hijack = await rest(t2, `profiles?username=eq.daan-${run}`, { method: "PATCH", body: JSON.stringify({ display_name: "gehackt" }), headers: { Prefer: "return=representation" } });
  ok(Array.isArray(hijack.data) && hijack.data.length === 0, "andermans profiel aanpassen via de API heeft geen effect");
  const up = await fetch(`${GW}/storage/v1/object/chat-attachments/${convId}/x.pdf`, { method: "POST", headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${t2}`, "Content-Type": "application/pdf" }, body: "%PDF-1.4" });
  ok(up.status >= 400, "ongeautoriseerde upload in andermans gesprek geweigerd");
  const exe = await fetch(`${GW}/storage/v1/object/avatars/${subOf(t2)}/x.exe`, { method: "POST", headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${t2}`, "Content-Type": "application/x-msdownload" }, body: "MZ" });
  ok(exe.status >= 400, "upload met verkeerd bestandstype geweigerd");
  ok((await rest(t2, "rpc/accept_proposal", { method: "POST", body: JSON.stringify({ p_proposal: ownProps.data[0].id }) })).status >= 400, "derde kan geen voorstel accepteren");

  // ── 8. Abonnement: webhook en limieten ───────────────────────────────
  console.log("\n8. Abonnement");
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const pro2Id = subOf(t2);
  const payload = JSON.stringify({ id: `evt_${run}`, object: "event", type: "customer.subscription.created", data: { object: { id: `sub_${run}`, object: "subscription", customer: `cus_${run}`, status: "active", cancel_at_period_end: false, metadata: { user_id: pro2Id }, items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] } } } });
  const post = (body, sig) => fetch(`${APP}/api/stripe/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": sig }, body });
  ok((await post(payload, "t=1,v1=vervalst")).status === 400, "vervalste webhook-handtekening geweigerd (400)");
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
  ok((await post(payload, sig)).status === 200, "geldige webhook verwerkt");
  ok((await (await post(payload, sig)).json()).duplicate === true, "zelfde event twee keer: idempotent overgeslagen");
  const st = await rest(t2, "rpc/my_account_status", { method: "POST", body: "{}" });
  ok(st.data.has_paid_pro === true && st.data.proposal_limit === null, "Pro-rechten alleen via server-side webhook toegekend");
  ok((await rest(t2, "subscriptions", { method: "POST", body: JSON.stringify({ user_id: pro2Id, status: "active" }) })).status >= 400, "gebruiker kan zichzelf geen abonnement geven");
  await go(pro2.page, "/account/abonnement");
  ok((await text(pro2.page)).includes("Je hebt Jobmarkt Pro"), "abonnementspagina toont Pro");

  // ── 9. Minderjarige ──────────────────────────────────────────────────
  console.log("\n9. Minderjarige (17)");
  const minor = await newUser("minderjarige", { mobile: true });
  const minorEmail = `jong-${run}@test.local`;
  await signUp(minor, { name: "Noa", email: minorEmail, birthdate: yearsAgo(17), role: "professional", username: `noa-${run}` });
  ok(minor.page.url().includes("/account/instellingen"), "17-jarige gaat na onboarding naar toestemming");
  ok((await text(minor.page)).includes("Toestemming van je ouder of voogd"), "uitleg over ouderlijke toestemming zichtbaar");
  ok(await minor.page.$eval('input[name="show_age"]', (e) => e.disabled), "leeftijd tonen kan niet onder 18");
  await go(minor.page, "/account/abonnement");
  ok((await text(minor.page)).includes("Pro is beschikbaar vanaf 18 jaar"), "betaalde functies geblokkeerd voor minderjarige");
  const cookieHeader = (await minor.page.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  const co = await fetch(`${APP}/api/billing/checkout`, { method: "POST", redirect: "manual", headers: { cookie: cookieHeader } });
  ok(co.status === 303 && !String(co.headers.get("location")).includes("stripe"), "checkout-route weigert minderjarige server-side");
  await go(minor.page, "/account/instellingen#toestemming");
  await minor.page.type("#g-email", `ouder-${run}@test.local`);
  await clickByText(minor.page, "Toestemming vragen");
  ok(await waitForText(minor.page, "We hebben je ouder of voogd een link gestuurd"), "toestemming aangevraagd");
  const outbox = await (await fetch(`${GW}/_outbox`)).json();
  const token = outbox.find((m) => m.to_email === `ouder-${run}@test.local`)?.payload?.token;
  const parent = await newUser("ouder");
  await go(parent.page, `/toestemming?token=${token}`);
  await parent.page.type("#naam", "Ouder van Noa");
  await parent.page.click('input[type="checkbox"]');
  await clickByText(parent.page, "Toestemming geven");
  ok(await waitForText(parent.page, "De toestemming is vastgelegd"), "ouder bevestigt toestemming via eenmalige link");
  await go(minor.page, "/account");
  ok(!(await text(minor.page)).includes("Toestemming van een ouder of voogd nodig"), "na toestemming verdwijnt de blokkade");

  // ── 10. Beheer ───────────────────────────────────────────────────────
  console.log("\n10. Beheer");
  await go(pro2.page, "/beheer");
  ok(!pro2.page.url().includes("/beheer"), "gewone gebruiker komt niet in beheer");
  const tClient = await tokenFor(clientEmail);
  await rest(tClient, "reports", { method: "POST", body: JSON.stringify({ target_type: "profiel", target_id: pro2Id, reason: "spam", details: "Test e2e" }) });
  const admin = await newUser("beheer");
  await login(admin, "beheer@jobmarkt.test", "Beheer-lokaal-2026");
  await go(admin.page, "/beheer/meldingen");
  ok((await text(admin.page)).includes("Test e2e"), "beheer ziet de melding");
  await admin.page.type('input[name="resolution"]', "Geen spam gevonden, profiel is in orde.");
  await admin.page.select('select[name="status"]', "afgewezen");
  await clickByText(admin.page, "Opslaan");
  await go(admin.page, "/beheer/audit");
  ok((await text(admin.page)).includes("melding_afgewezen"), "besluit staat in het auditlog");
  await go(client.page, "/account/meldingen-en-bezwaar");
  ok((await text(client.page)).includes("Geen spam gevonden"), "melder ziet gemotiveerd besluit");
  await shot(admin.page, "10-beheer-audit");

  // ── 11. Toegankelijkheid (basis) ─────────────────────────────────────
  console.log("\n11. Toegankelijkheid");
  const a11y = await newUser("a11y");
  for (const path of ["/", "/opdrachten", jobUrl, `/professionals/daan-${run}`, "/aanmelden", "/opdracht-plaatsen", "/prijzen"]) {
    await go(a11y.page, path);
    const r = await a11y.page.evaluate(() => {
      const unlabeled = [...document.querySelectorAll("input:not([type=hidden]), select, textarea")].filter((el) => {
        if (el.closest("[aria-hidden=true]") || el.classList.contains("hidden") || el.getAttribute("tabindex") === "-1") return false;
        const id = el.id;
        return !(el.getAttribute("aria-label") || (id && document.querySelector(`label[for="${id}"]`)) || el.closest("label"));
      }).map((el) => el.name || el.id);
      const imgs = [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length;
      const h1 = document.querySelectorAll("h1").length;
      return { unlabeled, imgs, h1, lang: document.documentElement.lang, skip: !!document.querySelector('a[href="#inhoud"]') };
    });
    ok(r.unlabeled.length === 0 && r.imgs === 0 && r.h1 === 1 && r.lang === "nl" && r.skip, `${path}: labels, alt-teksten, één h1, lang=nl, skiplink${r.unlabeled.length ? ` (zonder label: ${r.unlabeled.join(",")})` : ""}`);
  }
  await go(a11y.page, "/");
  await a11y.page.keyboard.press("Tab");
  const firstFocus = await a11y.page.evaluate(() => document.activeElement?.textContent?.trim());
  ok(firstFocus === "Naar de inhoud", "eerste Tab gaat naar ‘Naar de inhoud’");
  const outline = await a11y.page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  ok(outline !== "none", "zichtbare focusrand");
  await a11y.page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await go(a11y.page, "/");
  const dur = await a11y.page.evaluate(() => getComputedStyle(document.querySelector(".btn-primary")).transitionDuration);
  ok(parseFloat(dur) < 0.001, `reduced motion zet animaties uit (${dur})`);
} catch (e) {
  failures.push(`crash: ${e.message}`);
  console.error(e);
} finally {
  await browser.close();
}

writeFileSync(join(here, ".run", "e2e-result.json"), JSON.stringify({ passed, failures, at: new Date().toISOString() }, null, 2));
console.log(`\n${passed} geslaagd, ${failures.length} mislukt`);
if (failures.length) {
  console.log("Mislukt:\n- " + failures.join("\n- "));
  process.exit(1);
}
