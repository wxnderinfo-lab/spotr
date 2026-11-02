// Databasetests voor Jobmarkt: past baseline + alle migraties toe op een
// echte Postgres 17 (PGlite) en test wie wat mag, inclusief misbruik.
// Raakt nooit een echt Supabase-project. Draaien: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");
const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

const db = new PGlite();
await db.exec(readFileSync(join(here, "baseline.sql"), "utf8"));
for (const f of migrations) await db.exec(readFileSync(join(migrationsDir, f), "utf8"));
// tweede keer: migraties moeten veilig opnieuw kunnen draaien
for (const f of migrations) await db.exec(readFileSync(join(migrationsDir, f), "utf8"));

let passed = 0;
const failures = [];
function ok(cond, name) {
  if (cond) passed++;
  else failures.push(name);
  console.log(`${cond ? "  ok  " : "  FAIL"} ${name}`);
}

// Voert sql uit als een gebruiker (rol + JWT-claims), net als PostgREST.
async function as(user, sql, params = []) {
  const claims = user ? { sub: user, role: "authenticated" } : { role: "anon" };
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${user ? "authenticated" : "anon"}`);
    return tx.query(sql, params);
  });
}
async function err(user, sql, params = []) {
  try {
    await as(user, sql, params);
    return null;
  } catch (e) {
    return e.message;
  }
}
const one = async (user, sql, params) => (await as(user, sql, params)).rows[0];
const su = (sql, params) => db.query(sql, params);

async function createUser(email, name) {
  const r = await su("insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at) values ($1, 'x', $2, now()) returning id",
    [email, JSON.stringify({ display_name: name })]);
  return r.rows[0].id;
}
const yearsAgo = (y, extraDays = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setDate(d.getDate() - extraDays);
  return d.toISOString().slice(0, 10);
};

console.log(`migraties: ${migrations.length} bestanden, twee keer toegepast`);

// ── Accounts ─────────────────────────────────────────────────────────────
const client = await createUser("opdrachtgever@test.local", "Opdrachtgever");
const pro = await createUser("pro@test.local", "Professional");
const pro2 = await createUser("pro2@test.local", "Tweede pro");
const third = await createUser("derde@test.local", "Derde");
const minor = await createUser("minder@test.local", "Minderjarige");
const young = await createUser("jong@test.local", "Te jong");
const admin = await createUser("beheer@test.local", "Beheer");
await su("insert into public.user_roles (user_id, role) values ($1, 'admin')", [admin]);
await su(`update public.app_settings set value = '{"proposals_per_day":15,"max_proposals_per_job":25,"jobs_per_day":50,"questions_per_day":10,"messages_per_minute":20,"reports_per_day":10}' where key = 'anti_spam'`);

ok((await one(client, "select count(*)::int as n from public.profiles where id = $1", [client])).n === 1, "trigger maakt profiel bij nieuwe gebruiker");

for (const [u, name, user, provider] of [[client, "Opdrachtgever", "opdrachtgever", false], [pro, "Pro Een", "pro-een", true], [pro2, "Pro Twee", "pro-twee", true], [third, "Derde", "derde", true], [admin, "Beheer", "beheer", false]]) {
  await as(u, "select public.complete_onboarding($1, $2, $3, $4, 'v1')", [yearsAgo(30), name, user, provider]);
}
ok((await err(young, "select public.complete_onboarding($1, 'Jong', 'jong', true, 'v1')", [yearsAgo(15)]))?.includes("te_jong"), "onder 16: aanmelden geweigerd");
const minorRes = await one(minor, "select public.complete_onboarding($1, 'Mila', 'mila', true, 'v1') as r", [yearsAgo(17)]);
ok(minorRes.r.age_group === "minderjarig", "17-jarige herkend als minderjarig");
ok((await err(minor, "select public.complete_onboarding($1, 'Mila', 'mila', true, 'v1')", [yearsAgo(20)]))?.includes("geboortedatum_vast"), "geboortedatum kan niet achteraf veranderd worden");
ok((await err(minor, "update public.profile_private set birthdate = $1 where id = $2", [yearsAgo(20), minor])) !== null, "geboortedatum niet direct aan te passen");
ok((await err(third, "select guardian_consent_token_hash from public.profile_private")) !== null, "token-hash van toestemming niet leesbaar");
ok((await as(third, "select id, birthdate from public.profile_private where id = $1", [client])).rows.length === 0, "derde leest geen privégegevens van een ander");
ok((await as(third, "select id, birthdate from public.profile_private where id = $1", [third])).rows[0]?.birthdate, "eigen geboortedatum wel leesbaar");
ok((await err(null, "select id, birthdate from public.profile_private")) !== null, "anon heeft geen toegang tot privégegevens");
ok((await one(minor, "select public.public_age($1) as a", [minor])).a === null, "leeftijd minderjarige nooit openbaar");
await as(minor, "update public.profiles set show_age = true where id = $1", [minor]);
ok((await one(null, "select public.public_age($1) as a", [minor])).a === null, "ook met show_age blijft leeftijd minderjarige verborgen");

// ── Rechten op profielen en rollen ───────────────────────────────────────
ok((await err(third, "update public.profiles set status = 'actief', kvk_verified_at = now() where id = $1", [third])) !== null, "eigen verificatie/status zetten geweigerd");
const r1 = await as(third, "update public.profiles set display_name = 'gehackt' where id = $1 returning id", [client]);
ok(r1.rows.length === 0, "andermans profiel wijzigen heeft geen effect");
ok((await err(third, "insert into public.user_roles (user_id, role) values ($1, 'admin')", [third])) !== null, "jezelf admin maken geweigerd");
ok((await err(third, "insert into public.subscriptions (user_id, status) values ($1, 'active')", [third])) !== null, "zelf abonnement aanmaken geweigerd");
ok((await err(third, "insert into public.notifications (user_id, kind, title) values ($1, 'x', 'x')", [client])) !== null, "meldingen voor een ander aanmaken geweigerd");
ok((await err(third, "select * from public.webhook_events")) !== null, "webhook-events niet leesbaar");
ok((await err(third, "select public.admin_set_role($1, 'admin', true)", [third]))?.includes("geen_toegang"), "admin_set_role alleen voor admins");

// ── Opdracht plaatsen ────────────────────────────────────────────────────
const cat = async (slug) => (await su("select id from public.categories where slug = $1", [slug])).rows[0].id;
const place = async (slug) => (await su("select id from public.places where slug = $1", [slug])).rows[0].id;
const almere = await place("almere");
const amsterdam = await place("amsterdam");
const groningen = await place("groningen");
const schilder = await cat("schilderwerk");
const verhuis = await cat("verhuizen");
const videoEdit = await cat("video-editing");

async function newJob(owner, title, category = schilder, plc = almere, mode = "op_locatie") {
  const r = await as(owner, `insert into public.jobs (client_id, category_id, title, description, work_mode, place_id, budget_type, budget_min_cents, budget_max_cents)
    values ($1, $2, $3, 'Woonkamer en gang opnieuw schilderen, muren zijn in goede staat. Graag binnen drie weken.', $4, $5, 'vast', 30000, 60000) returning id`,
    [owner, category, title, mode, mode === "online" ? null : plc]);
  return r.rows[0].id;
}

ok((await err(client, `insert into public.jobs (client_id, category_id, title, description, work_mode, place_id, budget_type, status)
  values ($1, $2, 'Schilderwerk woonkamer', 'Woonkamer en gang opnieuw schilderen, muren zijn in goede staat.', 'op_locatie', $3, 'in_overleg', 'open')`, [client, schilder, almere])) !== null,
  "opdracht direct als 'open' aanmaken geweigerd");
ok((await err(third, `insert into public.jobs (client_id, category_id, title, description, work_mode, place_id, budget_type)
  values ($1, $2, 'Schilderwerk woonkamer', 'Woonkamer en gang opnieuw schilderen, muren zijn in goede staat.', 'op_locatie', $3, 'in_overleg')`, [client, schilder, almere])) !== null,
  "opdracht op naam van een ander aanmaken geweigerd");

const job1 = await newJob(client, "Woonkamer en gang schilderen");
ok((await as(null, "select id from public.jobs where id = $1", [job1])).rows.length === 0, "concept niet openbaar");
ok((await err(third, "select public.publish_job($1)", [job1]))?.includes("niet_gevonden"), "andermans opdracht publiceren geweigerd");
ok((await one(client, "select public.publish_job($1) as s", [job1])).s === "open", "opdrachtgever publiceert opdracht");
ok((await as(null, "select id from public.jobs where id = $1", [job1])).rows.length === 1, "gepubliceerde opdracht openbaar");
ok((await err(client, "update public.jobs set status = 'afgerond' where id = $1", [job1])) !== null, "status direct wijzigen geweigerd");
ok((await err(minor, `insert into public.jobs (client_id, category_id, title, description, work_mode, place_id, budget_type)
  values ($1, $2, 'Hulp bij schilderen kamer', 'Mijn kamer schilderen in een lichte kleur, ongeveer 12 m2 muur.', 'op_locatie', $3, 'in_overleg') returning id`, [minor, schilder, almere])) === null,
  "minderjarige mag een concept maken");
const minorJob = (await su("select id from public.jobs where client_id = $1", [minor])).rows[0].id;
ok((await err(minor, "select public.publish_job($1)", [minorJob]))?.includes("leeftijd_of_toestemming"), "minderjarige zonder toestemming kan niet publiceren");

// automatische moderatie: link of contactgegevens
const spamJob = await newJob(client, "Bel mij voor een klus");
await as(client, "update public.jobs set description = 'Bel 06-12345678 of kijk op www.voorbeeld.nl voor de klus en de details.' where id = $1", [spamJob]);
ok((await one(client, "select public.publish_job($1) as s", [spamJob])).s === "in_beoordeling", "opdracht met contactgegevens gaat naar moderatie");
ok((await as(null, "select id from public.jobs where id = $1", [spamJob])).rows.length === 0, "opdracht in moderatie niet openbaar");
const editJob = await newJob(client, "Schutting plaatsen in achtertuin");
await as(client, "select public.publish_job($1)", [editJob]);
await as(client, "update public.jobs set description = 'Kijk voor alle info op https://voorbeeld.nl/klus want daar staat meer.' where id = $1", [editJob]);
ok((await su("select moderation_status from public.jobs where id = $1", [editJob])).rows[0].moderation_status === "in_beoordeling", "link toevoegen na publiceren zet opdracht terug in moderatie");

// ── Voorstellen ──────────────────────────────────────────────────────────
const propose = (u, job, amount = 45000) => as(u, "select public.submit_proposal($1, 'vast', $2, null, $3, 'Kan volgende week starten', null, '{}') as id",
  [job, amount, "Ik heb ruime ervaring met binnenschilderwerk en werk netjes met afplakken en afdekken van alles."]);

ok((await err(pro, "select public.submit_proposal($1, 'vast', 45000, null, $2, '', null, '{}')", [job1, "Ik heb ruime ervaring met binnenschilderwerk en werk netjes en snel."]))?.includes("categorie_niet_in_profiel"),
  "voorstel buiten eigen categorieën geweigerd");
for (const u of [pro, pro2, third, minor]) await as(u, "insert into public.profile_categories (profile_id, category_id) values ($1, $2)", [u, await cat("klussen-en-bouw")]);
await as(pro, "insert into public.profile_categories (profile_id, category_id) values ($1, $2)", [pro, await cat("verhuizen-en-transport")]);
ok((await err(third, "insert into public.profile_categories (profile_id, category_id) values ($1, $2)", [pro, videoEdit])) !== null, "categorie aan andermans profiel toevoegen geweigerd");
ok((await err(client, "select public.submit_proposal($1, 'vast', 45000, null, $2, '', null, '{}')", [job1, "Ik heb ruime ervaring met binnenschilderwerk en werk netjes en snel."]))?.includes("eigen_opdracht"),
  "voorstel op eigen opdracht geweigerd");
const p1 = (await propose(pro, job1)).rows[0].id;
ok(!!p1, "professional verstuurt voorstel");
ok((await err(pro, "select public.submit_proposal($1, 'vast', 40000, null, $2, '', null, '{}')", [job1, "Nog een voorstel met andere prijs maar verder hetzelfde verhaal."]))?.includes("al_gereageerd"), "dubbel voorstel geweigerd");
const p2 = (await propose(pro2, job1, 42000)).rows[0].id;
ok((await err(minor, "select public.submit_proposal($1, 'vast', 30000, null, $2, '', null, '{}')", [job1, "Ik wil graag helpen met schilderen, ik heb thuis al vaker geschilderd."]))?.includes("leeftijd_of_toestemming"),
  "minderjarige zonder toestemming kan geen voorstel sturen");
const other = await newJob(client, "Nog een schilderklus slaapkamer");
await as(client, "select public.publish_job($1)", [other]);
ok((await err(third, "select public.submit_proposal($1, 'vast', 30000, null, $2, '', null, '{}')", [other, "Mail me even op jan@voorbeeld.nl dan stuur ik foto's van eerder werk."]))?.includes("contactgegevens"),
  "contactgegevens in voorstel geweigerd");

ok((await as(third, "select id from public.proposals where job_id = $1", [job1])).rows.length === 0, "derde ziet geen voorstellen van anderen");
ok((await as(client, "select id from public.proposals where job_id = $1", [job1])).rows.length === 2, "opdrachtgever ziet voorstellen op eigen opdracht");
ok((await as(pro, "select id from public.proposals where job_id = $1", [job1])).rows.length === 1, "professional ziet alleen eigen voorstel");

// ── Maandlimiet gratis en Pro ────────────────────────────────────────────
const extraJobs = [];
for (let i = 0; i < 5; i++) {
  const j = await newJob(client, `Schilderklus nummer ${i + 1} in Almere`);
  await as(client, "select public.publish_job($1)", [j]);
  extraJobs.push(j);
}
let quotaErr = null;
for (let i = 0; i < 5; i++) {
  try { await propose(pro2, extraJobs[i]); } catch (e) { quotaErr = { i, msg: e.message }; break; }
}
ok(quotaErr?.i === 4 && quotaErr.msg.includes("limiet_bereikt"), "gratis: zesde voorstel in een maand geweigerd (limiet 5)");
const status = await one(pro2, "select public.my_account_status() as s");
ok(status.s.proposals_this_month === 5 && status.s.proposal_limit === 5, "accountstatus toont gebruik 5 van 5");
await su("insert into public.subscriptions (user_id, status, current_period_end) values ($1, 'active', now() + interval '30 days')", [pro2]);
ok(!!(await propose(pro2, extraJobs[4])).rows[0].id, "met actief Pro-abonnement gaat het zesde voorstel door");
await su("update public.subscriptions set status = 'canceled', current_period_end = now() - interval '1 day' where user_id = $1", [pro2]);
ok((await one(pro2, "select public.has_pro($1) as p", [pro2])).p === false, "opgezegd en verlopen abonnement geeft geen Pro meer");
await su("update public.app_settings set value = to_jsonb((now() + interval '10 days')::date::text) where key = 'intro_period_until'");
ok((await one(pro2, "select public.has_pro($1) as p", [pro2])).p === true, "introductieperiode geeft iedereen Pro-rechten");
await su("update public.app_settings set value = 'null' where key = 'intro_period_until'");
ok((await err(pro2, "insert into public.saved_searches (user_id, kind, name, notify) values ($1, 'opdrachten', 'Schilderen', true)", [pro2])) !== null, "zoekmeldingen zonder Pro geweigerd");
ok((await err(pro2, "insert into public.saved_searches (user_id, kind, name, notify) values ($1, 'opdrachten', 'Schilderen', false)", [pro2])) === null, "zoekopdracht opslaan zonder meldingen mag");

// ── Vragen vóór acceptatie ───────────────────────────────────────────────
ok((await err(third, "select public.ask_question($1, 'Mag ik je bellen op 0612345678?')", [job1]))?.includes("contactgegevens"), "telefoonnummer in vraag geweigerd");
const q = await one(third, "select public.ask_question($1, 'Is de verf al gekocht of neem ik die mee?') as id", [job1]);
ok(!!q.id, "vraag stellen zonder contactgegevens");
ok((await err(pro, "select public.answer_question($1, 'Ja')", [q.id]))?.includes("geen_toegang"), "alleen opdrachtgever beantwoordt vragen");
await as(client, "select public.answer_question($1, 'De verf is er al, kleur RAL 9010.')", [q.id]);
ok((await as(null, "select answer from public.job_questions where id = $1", [q.id])).rows[0]?.answer?.includes("RAL"), "vraag en antwoord openbaar zichtbaar");

// ── Accepteren ───────────────────────────────────────────────────────────
ok((await err(third, "select public.accept_proposal($1)", [p1]))?.includes("geen_toegang"), "derde kan geen voorstel accepteren");
ok((await err(pro, "select public.accept_proposal($1)", [p1]))?.includes("geen_toegang"), "professional kan eigen voorstel niet accepteren");
const conv = (await one(client, "select public.accept_proposal($1) as c", [p1])).c;
ok(!!conv, "opdrachtgever accepteert voorstel, gesprek aangemaakt");
ok((await err(client, "select public.accept_proposal($1)", [p2]))?.includes("niet_open"), "tweede acceptatie op dezelfde opdracht geweigerd");
ok((await su("select status from public.proposals where id = $1", [p2])).rows[0].status === "gesloten", "andere voorstellen netjes gesloten");
ok((await su("select count(*)::int n from public.notifications where user_id = $1 and kind = 'opdracht_gesloten'", [pro2])).rows[0].n === 1, "afgewezen professional krijgt melding");
let uniqueErr = null;
try { await su("update public.proposals set status = 'geaccepteerd' where id = $1", [p2]); } catch (e) { uniqueErr = e.message; }
ok(uniqueErr?.includes("proposals_one_accepted"), "database-index voorkomt twee geaccepteerde voorstellen (ook buiten de functie om)");

// ── Gesprek en contact ───────────────────────────────────────────────────
ok((await as(pro, "select id from public.conversations where id = $1", [conv])).rows.length === 1, "professional ziet gesprek");
ok((await as(third, "select id from public.conversations where id = $1", [conv])).rows.length === 0, "derde ziet gesprek niet");
ok((await as(pro2, "select id from public.messages where conversation_id = $1", [conv])).rows.length === 0, "afgewezen professional leest geen berichten");
ok((await err(third, "insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hoi')", [conv, third])) !== null, "derde kan geen bericht sturen");
ok((await err(pro, "insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'namens jou')", [conv, client])) !== null, "bericht namens ander geweigerd");
ok((await err(pro, "insert into public.messages (conversation_id, sender_id, body, kind) values ($1, $2, 'nep systeem', 'systeem')", [conv, pro])) !== null, "systeembericht vervalsen geweigerd");
await as(pro, "insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Hoi! Zullen we dinsdag beginnen?')", [conv, pro]);
const unread = await one(client, "select public.my_account_status() as s");
ok(unread.s.unread_messages >= 1, "opdrachtgever heeft ongelezen bericht");
await as(client, "select public.mark_conversation_read($1)", [conv]);
ok((await one(client, "select public.my_account_status() as s")).s.unread_messages === 0, "gelezen markeren werkt");
ok((await err(pro, "insert into public.messages (conversation_id, sender_id, body, attachment_path) values ($1, $2, 'bijlage', 'ander-gesprek/x.pdf')", [conv, pro]))?.includes("ongeldige_bijlage"),
  "bijlage uit ander gesprek geweigerd");

// live: leesbevestiging, laatst actief, tellers en privé kanalen
const peerForPro = (await one(pro, "select public.conversation_peer($1) as p", [conv])).p;
ok(!!peerForPro.last_read_at, "professional ziet tot wanneer de opdrachtgever gelezen heeft");
ok((await as(pro, "select user_id from public.conversation_reads where conversation_id = $1", [conv])).rows.some((r) => r.user_id === client),
  "leesmoment van de ander zichtbaar voor deelnemer");
ok((await as(third, "select user_id from public.conversation_reads")).rows.length === 0, "derde ziet geen leesmomenten");
ok((await err(third, "select public.conversation_peer($1)", [conv]))?.includes("geen_toegang"), "derde kan status in gesprek niet opvragen");
ok(peerForPro.last_seen_at === null, "laatst actief leeg zolang de ander niet actief was");
await as(client, "select public.touch_last_seen()");
ok(!!(await one(pro, "select public.conversation_peer($1) as p", [conv])).p.last_seen_at, "laatst actief zichtbaar voor gesprekspartner");
ok((await err(pro, "select last_seen_at from public.profile_private where id = $1", [client])) !== null, "laatst actief niet rechtstreeks leesbaar");
await as(pro, "insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Nog een vraag')", [conv, pro]);
const counts = (await one(client, "select public.my_live_counts() as c")).c;
ok(counts.messages === 1 && counts.notifications >= 1, "live tellers voor berichten en meldingen");
ok((await one(null, "select public.my_live_counts() as c").catch(() => ({ c: null }))).c === null, "anoniem krijgt geen tellers");
ok((await one(pro, "select public.can_use_realtime_topic($1) as r", [`gesprek:${conv}`])).r === true, "deelnemer mag het privé gesprekskanaal gebruiken");
ok((await one(third, "select public.can_use_realtime_topic($1) as r", [`gesprek:${conv}`])).r === false, "derde mag het gesprekskanaal niet gebruiken");
ok((await one(pro, "select public.can_use_realtime_topic('gesprek:geen-uuid') as r")).r === false, "ongeldig kanaal geweigerd zonder fout");
ok((await one(pro, "select public.can_use_realtime_topic('meldingen') as r")).r === false, "onbekend kanaal geweigerd");
await as(client, "insert into public.blocks (blocker_id, blocked_id) values ($1, $2)", [client, pro]);
ok((await one(pro, "select public.can_use_realtime_topic($1) as r", [`gesprek:${conv}`])).r === false, "na blokkeren geen typ- of aanwezigheidskanaal");
ok((await one(pro, "select public.conversation_peer($1) as p", [conv])).p.last_seen_at === null, "na blokkeren geen laatst actief");
await su("delete from public.blocks where blocker_id = $1 and blocked_id = $2", [client, pro]);
await as(client, "select public.mark_conversation_read($1)", [conv]);

ok((await err(third, "select public.share_phone($1, '0612345678')", [conv]))?.includes("geen_toegang"), "derde kan geen nummer delen in gesprek");
await as(pro, "select public.share_phone($1, '06 12 34 56 78')", [conv]);
const shared = await as(client, "select phone from public.contact_shares where conversation_id = $1", [conv]);
ok(shared.rows[0]?.phone === "+31612345678", "opdrachtgever ziet vrijwillig gedeeld nummer (genormaliseerd)");
ok((await as(third, "select phone from public.contact_shares")).rows.length === 0, "derde ziet geen gedeelde nummers");
await as(pro, "select public.revoke_phone($1)", [conv]);
ok((await as(client, "select phone from public.contact_shares where conversation_id = $1", [conv])).rows.length === 0, "ingetrokken nummer niet meer zichtbaar");

// moderator: alleen bij een open melding over een bericht in het gesprek
await su("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [pro2]);
ok((await as(pro2, "select id from public.messages where conversation_id = $1", [conv])).rows.length === 0, "moderator zonder melding leest gesprek niet");
const msg = (await su("select id from public.messages where conversation_id = $1 and kind = 'bericht' limit 1", [conv])).rows[0].id;
await as(client, "insert into public.reports (target_type, target_id, reason, details) values ('bericht', $1, 'intimidatie', 'test')", [msg]);
ok((await as(pro2, "select id from public.messages where conversation_id = $1", [conv])).rows.length > 0, "moderator leest gesprek alleen bij open melding");
await su("delete from public.user_roles where user_id = $1 and role = 'moderator'", [pro2]);

// ── Statusmodel ──────────────────────────────────────────────────────────
ok((await err(client, "select public.transition_job($1, 'bezig')", [job1]))?.includes("ongeldige_overgang"), "opdrachtgever kan niet 'bezig' zetten");
ok((await err(third, "select public.transition_job($1, 'afgerond')", [job1]))?.includes("geen_toegang"), "derde kan status niet wijzigen");
ok((await err(pro, "select public.transition_job($1, 'afgerond')", [job1]))?.includes("ongeldige_overgang"), "overslaan van stappen geweigerd");
await as(pro, "select public.transition_job($1, 'bezig')", [job1]);
await as(pro, "select public.transition_job($1, 'opgeleverd')", [job1]);
ok((await err(pro, "select public.submit_review($1, 5, 5, 5, 5, 'Top')", [job1]))?.includes("niet_afgerond"), "beoordelen vóór afronden geweigerd");
await as(client, "select public.transition_job($1, 'afgerond')", [job1]);
ok((await su("select status from public.jobs where id = $1", [job1])).rows[0].status === "afgerond", "opdracht afgerond");
ok((await su("select count(*)::int n from public.job_status_history where job_id = $1", [job1])).rows[0].n === 5, "statusgeschiedenis vastgelegd");

// ── Beoordelingen ────────────────────────────────────────────────────────
ok((await err(third, "select public.submit_review($1, 1, 1, 1, 1, 'Slecht')", [job1]))?.includes("geen_deelnemer"), "niet-deelnemer kan niet beoordelen");
ok((await err(pro2, "select public.submit_review($1, 1, 1, 1, 1, 'Slecht')", [job1]))?.includes("geen_deelnemer"), "afgewezen professional kan niet beoordelen");
ok((await err(pro, `insert into public.reviews (job_id, reviewer_id, reviewee_id, reviewee_role, rating) values ($1, $2, $2, 'professional', 5)`, [job1, pro])) !== null, "zelfreview via directe insert geweigerd");
const rv = await one(client, "select public.submit_review($1, 5, 5, 4, 5, 'Netjes gewerkt en goed gecommuniceerd.') as id", [job1]);
ok(!!rv.id, "opdrachtgever beoordeelt professional");
ok((await err(client, "select public.submit_review($1, 1, 1, 1, 1, 'Toch niet')", [job1]))?.includes("al_beoordeeld"), "tweede beoordeling geweigerd");
ok((await as(null, "select * from public.get_reviews($1)", [pro])).rows.length === 0, "dubbelblind: nog niet openbaar zolang pro niet beoordeeld heeft");
ok((await as(pro, "select id from public.reviews where reviewee_id = $1", [pro])).rows.length === 0, "dubbelblind: pro ziet ontvangen beoordeling nog niet");
await as(pro, "select public.submit_review($1, 5, 5, null, 5, 'Duidelijke opdracht, prettig contact.')", [job1]);
ok((await as(null, "select * from public.get_reviews($1)", [pro])).rows.length === 1, "na beide beoordelingen openbaar");
const stats = (await one(null, "select public.profile_stats($1) as s", [pro])).s;
ok(Number(stats.rating_avg) === 5 && stats.rating_count === 1 && stats.completed_as_provider === 1, "gemiddelde alleen uit gepubliceerde, geldige beoordelingen");
ok((await err(third, "select public.respond_to_review($1, 'Reactie')", [rv.id]))?.includes("geen_toegang"), "alleen beoordeelde kan reageren");
await as(pro, "select public.respond_to_review($1, 'Dank je wel voor de fijne samenwerking!')", [rv.id]);

// ── Melden, moderatie en audit ───────────────────────────────────────────
const rep = await one(third, "insert into public.reports (target_type, target_id, reason, details) values ('beoordeling', $1, 'nep_beoordeling', 'Lijkt nep') returning id", [rv.id]);
ok((await as(client, "select id from public.reports where id = $1", [rep.id])).rows.length === 0, "andermans melding niet leesbaar");
ok((await err(third, "select public.mod_handle_report($1, 'afgehandeld', 'Verwijderd', 'verberg_inhoud')", [rep.id]))?.includes("geen_toegang"), "gewone gebruiker kan meldingen niet afhandelen");
ok((await err(third, "update public.reports set status = 'afgehandeld' where id = $1", [rep.id])) !== null, "melding direct wijzigen geweigerd");
await as(admin, "select public.mod_handle_report($1, 'afgewezen', 'De beoordeling hoort bij een echte, afgeronde opdracht.', 'geen')", [rep.id]);
ok((await as(admin, "select count(*)::int n from public.audit_log where target_id = $1", [rep.id])).rows[0].n === 1, "besluit vastgelegd in auditlog");
ok((await as(third, "select * from public.audit_log")).rows.length === 0, "auditlog niet leesbaar voor gewone gebruiker");
ok((await su("select count(*)::int n from public.notifications where user_id = $1 and kind = 'melding_besluit'", [third])).rows[0].n === 1, "melder krijgt gemotiveerd besluit");
let rlErr = null;
for (let i = 0; i < 11; i++) {
  try { await as(third, "insert into public.reports (target_type, target_id, reason) values ('profiel', $1, 'spam')", [client]); } catch (e) { rlErr = e.message; break; }
}
ok(rlErr?.includes("te_veel_acties"), "meldlimiet per dag werkt");

// blokkeren
await as(client, "insert into public.blocks (blocker_id, blocked_id) values ($1, $2)", [client, third]);
ok((await err(third, "select public.ask_question($1, 'Is het werk binnen of buiten?')", [other]))?.includes("geblokkeerd"), "geblokkeerde gebruiker kan geen vraag stellen");
ok((await as(third, "select id from public.search_jobs()")).rows.every((r) => r.id !== other), "geblokkeerde gebruiker ziet opdrachten van blokkeerder niet in zoeken");

// ── Minderjarige met toestemming ─────────────────────────────────────────
await as(minor, "select public.request_guardian_consent('ouder@test.local')");
const outbox = (await su("select payload from public.email_outbox where template = 'ouderlijke_toestemming' order by created_at desc limit 1")).rows[0];
ok(!!outbox?.payload?.token, "toestemmingslink klaargezet voor ouder");
ok((await one(null, "select public.confirm_guardian_consent('verkeerd', 'Ouder Naam') as ok")).ok === false, "verkeerde token geweigerd");
ok((await one(null, "select public.confirm_guardian_consent($1, 'Ouder Naam') as ok", [outbox.payload.token])).ok === true, "ouder bevestigt toestemming");
ok((await one(minor, "select public.my_account_status() as s")).s.can_contract === true, "minderjarige met toestemming kan overeenkomsten aangaan");
const moveJob = await newJob(client, "Hulp bij verhuizen naar Amsterdam", verhuis, almere);
await as(client, "select public.publish_job($1)", [moveJob]);
await as(minor, "insert into public.profile_categories (profile_id, category_id) values ($1, $2)", [minor, await cat("verhuizen-en-transport")]);
ok((await err(minor, "select public.submit_proposal($1, 'vast', 20000, null, $2, '', null, '{}')", [moveJob, "Ik help graag met tillen en sjouwen, ik ben sterk en heb tijd."]))?.includes("categorie_18_plus"),
  "18+-categorie blijft dicht voor minderjarige, ook met toestemming");

// ── Zoeken ───────────────────────────────────────────────────────────────
const anonSearch = await as(null, "select * from public.search_jobs(p_category => 'klussen-en-bouw')");
ok(anonSearch.rows.length > 0 && anonSearch.rows.every((r) => r.title), "anon kan opdrachten zoeken op hoofdcategorie");
await as(pro, "update public.profiles set place_id = $1, travel_radius_km = 30, works_on_location = true where id = $2", [almere, pro]);
const match = await as(pro, "select * from public.search_jobs(p_sort => 'match')");
ok(match.rows[0]?.match_reasons?.includes("Past bij je categorieën"), "matching legt uit waarom een opdracht past");
const far = await newJob(client, "Schilderwerk kozijnen in Groningen", schilder, groningen);
await as(client, "select public.publish_job($1)", [far]);
const near = await as(null, "select id, distance_km from public.search_jobs(p_place => $1, p_radius_km => 30)", [amsterdam]);
ok(near.rows.length > 0 && near.rows.every((r) => r.id !== far), "afstandsfilter sluit verre opdrachten uit");
const onlineJob = await newJob(client, "Video van bruiloft monteren tot vijf minuten", videoEdit, null, "online");
await as(client, "select public.publish_job($1)", [onlineJob]);
ok((await as(null, "select id from public.search_jobs(p_mode => 'online')")).rows.some((r) => r.id === onlineJob), "filter online werkt");
await as(pro, "update public.profiles set headline = 'Schilder met tien jaar ervaring', skills = '{schilderen,behangen}' where id = $1", [pro]);
const pros = await as(null, "select * from public.search_professionals(p_q => 'schilder')");
ok(pros.rows.some((r) => r.id === pro && Number(r.rating_avg) === 5), "professionals zoeken toont beoordelingen uit gepubliceerde reviews");

// ── Account ──────────────────────────────────────────────────────────────
const live = await newJob(client, "Lopende klus voor verwijdertest");
await as(client, "select public.publish_job($1)", [live]);
const lp = (await propose(pro, live)).rows[0].id;
await as(client, "select public.accept_proposal($1)", [lp]);
ok((await one(client, "select public.can_delete_account() as s")).s === "lopende_opdracht", "account verwijderen geblokkeerd tijdens lopende opdracht");
const exp = (await one(client, "select public.export_my_data() as d")).d;
ok(exp.profile?.id === client && Array.isArray(exp.jobs) && exp.jobs.length > 0 && !("guardian_consent_token_hash" in (exp.private ?? {})), "data-export bevat eigen gegevens zonder geheimen");

// ── Opslag ───────────────────────────────────────────────────────────────
await db.exec(readFileSync(join(here, "local-only.sql"), "utf8"));
ok((await err(third, "select public._local_storage_insert('avatars', $1)", [`${client}/x.webp`])) !== null, "uploaden in andermans map geweigerd");
ok((await err(third, "select public._local_storage_insert('avatars', $1)", [`${third}/x.webp`])) === null, "uploaden in eigen map mag");
ok((await err(third, "select public._local_storage_insert('chat-attachments', $1)", [`${conv}/a.pdf`])) !== null, "chatbijlage uploaden door niet-deelnemer geweigerd");
ok((await err(pro, "select public._local_storage_insert('chat-attachments', $1)", [`${conv}/a.pdf`])) === null, "chatbijlage uploaden door deelnemer mag");
ok((await one(third, "select public._local_storage_can_read('chat-attachments', $1) as ok", [`${conv}/a.pdf`])).ok === false, "chatbijlage niet leesbaar voor derde");
ok((await one(client, "select public._local_storage_can_read('chat-attachments', $1) as ok", [`${conv}/a.pdf`])).ok === true, "chatbijlage leesbaar voor deelnemer");
ok((await err(null, "select public._local_storage_insert('avatars', 'anon/x.webp')")) !== null, "anon kan niet uploaden");

// verlopen
await su("update public.jobs set expires_at = now() - interval '1 minute' where id = $1", [other]);
ok((await su("select public.expire_jobs() as n")).rows[0].n >= 1, "verlopen opdrachten worden gesloten");

// ── Diensten met pakketten ───────────────────────────────────────────────
const svc = (u, pk, cover = null) => as(u, `insert into public.services (provider_id, category_id, slug, title, description, price_type, price_cents, packages, cover_path)
  values ($1, $2, $3, 'Woonkamer schilderen compleet', 'Muren en plafond in twee lagen, inclusief afplakken en opruimen na afloop.', 'vanaf', 25000, $4, $5) returning id`,
  [u, schilder, `dienst-${crypto.randomUUID().slice(0, 8)}`, JSON.stringify(pk), cover]);
const pk3 = [{ name: "Basis", price_cents: 25000, description: "Alleen muren", delivery: "1 dag" }, { name: "Plus", price_cents: 39500, description: "Muren en plafond" }, { name: "Compleet", price_cents: 60000 }];
ok((await svc(pro, pk3, `${pro}/omslag.webp`)).rows.length === 1, "dienst met drie pakketten en eigen omslagfoto");
ok((await one(pro, "select public.valid_service_packages('[]') as v")).v === true, "lege pakketlijst is geldig (diensten zonder pakketten)");
ok(await svc(pro, [...pk3, { name: "Extra", price_cents: 70000 }]).then(() => false, () => true), "meer dan drie pakketten geweigerd");
ok(await svc(pro, [{ name: "Basis", price_cents: 50 }]).then(() => false, () => true), "pakketprijs onder € 1 geweigerd");
ok(await svc(pro, [{ name: "B", price_cents: 5000 }]).then(() => false, () => true), "te korte pakketnaam geweigerd");
ok(await svc(pro, [{ name: "Basis", price_cents: "5000" }]).then(() => false, () => true), "prijs als tekst geweigerd");
ok(await svc(pro, [{ name: "Basis", price_cents: 5000, script: "<x>" }]).then(() => false, () => true), "onbekende velden in pakket geweigerd");
ok(await svc(pro, pk3, `${client}/van-een-ander.webp`).then(() => false, () => true), "omslagfoto uit andermans map geweigerd");
ok(await svc(pro, pk3, `${pro}/../${client}/x.webp`).then(() => false, () => true), "omslagpad met .. geweigerd");

console.log(`\n${passed} geslaagd, ${failures.length} mislukt`);
if (failures.length) {
  console.log("Mislukt:\n- " + failures.join("\n- "));
  process.exit(1);
}
