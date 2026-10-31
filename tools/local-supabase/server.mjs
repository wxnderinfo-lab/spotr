// Lokale stand-in voor een Supabase-project, om Jobmarkt end-to-end te testen
// zonder een echt project, echte e-mail of echte betalingen.
//
//   Postgres : PGlite (Postgres 17 in WebAssembly) + alle repo-migraties
//   REST     : de echte PostgREST-binary (POSTGREST_BIN)
//   Auth     : kleine stub: aanmelden met e-mailbevestiging, inloggen,
//              wachtwoordherstel, verwijderen. Mails gaan naar /_mailbox.
//   Storage  : kleine stub die de storage-RLS echt toepast; bestanden op schijf
//   Realtime : niet nagebootst; de chat valt dan terug op periodiek ophalen
//
// Gateway: http://localhost:54321. Start: POSTGREST_BIN=... node server.mjs
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, createReadStream, statSync, rmSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const runDir = join(here, ".run");
rmSync(join(runDir, "storage"), { recursive: true, force: true });
mkdirSync(join(runDir, "storage"), { recursive: true });

const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const PG_PORT = GATEWAY_PORT + 8;
const REST_PORT = GATEWAY_PORT + 9;
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3100";
const JWT_SECRET = "local-only-test-secret-not-used-anywhere-else-000";

// ── JWT ─────────────────────────────────────────────────────────────────
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
function sign(payload) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verify(token) {
  try {
    const [head, body, sig] = String(token).split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
    if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
const far = 4102444800;
const ANON_KEY = sign({ iss: "supabase-local", role: "anon", exp: far });
const SERVICE_KEY = sign({ iss: "supabase-local", role: "service_role", exp: far });

// ── Database ────────────────────────────────────────────────────────────
const db = new PGlite();
await db.exec(readFileSync(join(here, "baseline.sql"), "utf8"));
for (const f of readdirSync(join(root, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(join(root, "supabase", "migrations", f), "utf8"));
}
await db.exec(readFileSync(join(here, "local-only.sql"), "utf8"));
await db.exec(readFileSync(join(here, "seed.sql"), "utf8"));
console.log("database klaar (migraties + lokale seed)");

const pgServer = new PGLiteSocketServer({ db, port: PG_PORT, host: "127.0.0.1", maxConnections: 20 });
await pgServer.start();

// ── PostgREST ───────────────────────────────────────────────────────────
const postgrestBin = process.env.POSTGREST_BIN ?? join(here, "bin", process.platform === "win32" ? "postgrest.exe" : "postgrest");
if (!postgrestBin || !existsSync(postgrestBin)) {
  console.error("Zet POSTGREST_BIN naar de PostgREST-binary (https://github.com/PostgREST/postgrest/releases).");
  process.exit(1);
}
const confPath = join(runDir, "postgrest.conf");
writeFileSync(confPath, [
  `db-uri = "postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres?sslmode=disable"`,
  `db-schemas = "public"`,
  `db-anon-role = "anon"`,
  `db-pool = 1`, // PGlite doet één query tegelijk
  `db-channel-enabled = false`,
  `db-prepared-statements = false`,
  `jwt-secret = "${JWT_SECRET}"`,
  `server-host = "127.0.0.1"`,
  `server-port = ${REST_PORT}`,
  `log-level = "error"`,
].join("\n"));
const rest = spawn(postgrestBin, [confPath], { stdio: ["ignore", "inherit", "inherit"] });
rest.on("exit", (code) => console.error(`PostgREST gestopt (${code})`));

// Alle databasetoegang van de stubs loopt via PostgREST (één verbinding).
async function rpc(fn, args, token = SERVICE_KEY) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const r = await fetch(`http://127.0.0.1:${REST_PORT}/rpc/${fn}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(args),
      });
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw Object.assign(new Error(data?.message ?? `rpc ${fn} ${r.status}`), { status: r.status });
      return data;
    } catch (e) {
      if (e.status) throw e;
      await new Promise((res) => setTimeout(res, 250)); // PostgREST start nog
    }
  }
  throw new Error("PostgREST niet bereikbaar");
}

// ── Helpers ─────────────────────────────────────────────────────────────
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, prefer, accept, accept-profile, content-profile, range, x-client-info, x-upsert, cache-control, x-supabase-api-version",
  "Access-Control-Expose-Headers": "content-range, content-location, location",
};
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...cors, ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve) => { const chunks = []; req.on("data", (c) => chunks.push(c)); req.on("end", () => resolve(Buffer.concat(chunks))); });
const json = async (req) => { try { return JSON.parse((await readBody(req)).toString() || "{}"); } catch { return {}; } };
const bearer = (req) => (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || req.headers.apikey || "";

function proxy(req, res, port, path) {
  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const upstream = http.request({ host: "127.0.0.1", port, path, method: req.method, headers }, (up) => {
    const h = Object.fromEntries(Object.entries(up.headers).filter(([k]) => !k.toLowerCase().startsWith("access-control-")));
    res.writeHead(up.statusCode ?? 502, { ...h, ...cors });
    up.pipe(res);
  });
  upstream.on("error", () => send(res, 502, { message: "upstream niet klaar" }));
  req.pipe(upstream);
}

// ── Auth ────────────────────────────────────────────────────────────────
const mailbox = []; // { to, type, token_hash, link, at }
const otps = new Map(); // token_hash -> { id, type }
const refreshTokens = new Map();
const hashPw = (pw) => "local$" + crypto.createHash("sha256").update(String(pw)).digest("hex");

async function users() {
  return rpc("_local_auth_users", {});
}
async function findUser(pred) {
  return (await users()).find(pred) ?? null;
}
function userJson(u) {
  return {
    id: u.id, aud: "authenticated", role: "authenticated", email: u.email,
    email_confirmed_at: u.email_confirmed_at, confirmed_at: u.email_confirmed_at,
    app_metadata: u.raw_app_meta_data ?? { provider: "email", providers: ["email"] },
    user_metadata: u.raw_user_meta_data ?? {}, identities: [], factors: [],
    created_at: u.created_at, updated_at: u.updated_at,
  };
}
function session(u) {
  const now = Math.floor(Date.now() / 1000);
  const access = sign({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", aal: "aal1", session_id: crypto.randomUUID(), iat: now, exp: now + 3600 });
  const refresh = crypto.randomBytes(16).toString("hex");
  refreshTokens.set(refresh, u.id);
  return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: refresh, user: userJson(u) };
}
function mail(to, type, id, redirectTo) {
  const token_hash = crypto.randomBytes(20).toString("hex");
  otps.set(token_hash, { id, type });
  const linkType = type === "signup" ? "email" : type;
  const next = redirectTo ? `&next=${encodeURIComponent(new URL(redirectTo).pathname + new URL(redirectTo).search)}` : "";
  const link = `${SITE_URL}/auth/bevestigen?token_hash=${token_hash}&type=${linkType}${next}`;
  mailbox.push({ to, type, token_hash, link, at: new Date().toISOString() });
  console.log(`[mail] ${type} → ${to}: ${link}`);
}
const authError = (res, status, code, msg) => send(res, status, { code: status, error_code: code, msg, message: msg, error: code, error_description: msg });

async function handleAuth(req, res, url) {
  const path = url.pathname.replace("/auth/v1", "");
  if (path === "/signup" && req.method === "POST") {
    const body = await json(req);
    const email = String(body.email ?? "").toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return authError(res, 400, "validation_failed", "Unable to validate email address: invalid format");
    if (String(body.password ?? "").length < 8) return authError(res, 422, "weak_password", "Password should be at least 8 characters.");
    const existing = await findUser((u) => u.email === email);
    if (existing) {
      // zoals Supabase: geen lek of het adres al bestaat
      return send(res, 200, { ...userJson(existing), identities: [] });
    }
    const id = await rpc("_local_auth_create_user", { p_email: email, p_password: hashPw(body.password), p_meta: body.data ?? {}, p_confirmed: false });
    const u = await findUser((x) => x.id === id);
    mail(email, "signup", id, url.searchParams.get("redirect_to"));
    return send(res, 200, userJson(u));
  }
  if (path === "/token" && req.method === "POST") {
    const body = await json(req);
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const u = await findUser((x) => x.email === String(body.email ?? "").toLowerCase() && x.encrypted_password === hashPw(body.password));
      if (!u) return authError(res, 400, "invalid_credentials", "Invalid login credentials");
      if (!u.email_confirmed_at) return authError(res, 400, "email_not_confirmed", "Email not confirmed");
      return send(res, 200, session(u));
    }
    if (grant === "refresh_token") {
      const id = refreshTokens.get(body.refresh_token);
      const u = id && (await findUser((x) => x.id === id));
      if (!u) return authError(res, 400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
      return send(res, 200, session(u));
    }
    return authError(res, 400, "unsupported_grant_type", "unsupported grant");
  }
  if (path === "/verify" && req.method === "POST") {
    const body = await json(req);
    const otp = otps.get(body.token_hash);
    if (!otp) return authError(res, 403, "otp_expired", "Email link is invalid or has expired");
    otps.delete(body.token_hash);
    await rpc("_local_auth_update", { p_id: otp.id, p_password: null, p_confirm: true });
    const u = await findUser((x) => x.id === otp.id);
    return send(res, 200, session(u));
  }
  if (path === "/recover" && req.method === "POST") {
    const body = await json(req);
    const u = await findUser((x) => x.email === String(body.email ?? "").toLowerCase());
    if (u) mail(u.email, "recovery", u.id, url.searchParams.get("redirect_to"));
    return send(res, 200, {});
  }
  if (path === "/resend" && req.method === "POST") {
    const body = await json(req);
    const u = await findUser((x) => x.email === String(body.email ?? "").toLowerCase());
    if (u && !u.email_confirmed_at) mail(u.email, "signup", u.id, null);
    return send(res, 200, {});
  }
  if (path === "/user") {
    const claims = verify(bearer(req));
    const u = claims?.sub && (await findUser((x) => x.id === claims.sub));
    if (!u) return authError(res, 401, "bad_jwt", "invalid JWT");
    if (req.method === "PUT") {
      const body = await json(req);
      if (body.password !== undefined && String(body.password).length < 8) return authError(res, 422, "weak_password", "Password should be at least 8 characters.");
      await rpc("_local_auth_update", { p_id: u.id, p_password: body.password ? hashPw(body.password) : null, p_confirm: false });
      return send(res, 200, userJson(await findUser((x) => x.id === u.id)));
    }
    return send(res, 200, userJson(u));
  }
  if (path.startsWith("/admin/users/") && req.method === "DELETE") {
    if (verify(bearer(req))?.role !== "service_role") return authError(res, 403, "not_admin", "User not allowed");
    await rpc("_local_auth_delete", { p_id: path.split("/")[3] });
    return send(res, 200, {});
  }
  if (path === "/logout") return send(res, 204);
  if (path === "/settings") return send(res, 200, { external: { email: true }, disable_signup: false, mailer_autoconfirm: false });
  return authError(res, 404, "not_found", `auth-stub: ${req.method} ${path} niet nagebootst`);
}

// ── Storage ─────────────────────────────────────────────────────────────
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
const typeFile = (file) => file + ".type";

async function handleStorage(req, res, url) {
  const rel = url.pathname.replace("/storage/v1/object/", "");
  const parts = rel.split("/").map(decodeURIComponent);
  const token = bearer(req);
  const claims = verify(token) ?? { role: "anon" };

  const serveFile = (bucket, name) => {
    const file = join(runDir, "storage", bucket, ...name.split("/"));
    if (!existsSync(file) || !statSync(file).isFile()) return send(res, 404, { statusCode: "404", error: "not_found", message: "Object not found" });
    const type = existsSync(typeFile(file)) ? readFileSync(typeFile(file), "utf8") : MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store", ...cors });
    return createReadStream(file).pipe(res);
  };

  if (parts[0] === "public" && req.method === "GET") {
    const [, bucket, ...rest] = parts;
    const b = await rpc("_local_storage_bucket", { p_bucket: bucket });
    if (!b?.public) return send(res, 400, { statusCode: "400", error: "not_public", message: "Bucket is not public" });
    return serveFile(bucket, rest.join("/"));
  }
  if (parts[0] === "sign" && req.method === "POST") {
    const [, bucket, ...rest] = parts;
    const name = rest.join("/");
    const body = await json(req);
    const allowed = await rpc("_local_storage_can_read", { p_bucket: bucket, p_name: name }, token).catch(() => false);
    if (!allowed) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    const t = sign({ url: `${bucket}/${name}`, exp: Math.floor(Date.now() / 1000) + Number(body.expiresIn ?? 60) });
    return send(res, 200, { signedURL: `/object/sign/${bucket}/${rest.map(encodeURIComponent).join("/")}?token=${t}` });
  }
  if (parts[0] === "sign" && req.method === "GET") {
    const [, bucket, ...rest] = parts;
    const name = rest.join("/");
    const t = verify(url.searchParams.get("token"));
    if (!t || t.url !== `${bucket}/${name}`) return send(res, 400, { statusCode: "400", error: "InvalidJWT", message: "invalid signature" });
    return serveFile(bucket, name);
  }
  if (req.method === "POST" || req.method === "PUT") {
    const [bucket, ...rest] = parts;
    const name = rest.join("/");
    const body = await readBody(req);
    const b = await rpc("_local_storage_bucket", { p_bucket: bucket });
    if (!b) return send(res, 404, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
    const type = String(req.headers["content-type"] ?? "").split(";")[0];
    if (b.allowed_mime_types && !b.allowed_mime_types.includes(type)) return send(res, 400, { statusCode: "415", error: "invalid_mime_type", message: `mime type ${type} is not supported` });
    if (b.file_size_limit && body.length > Number(b.file_size_limit)) return send(res, 400, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" });
    if (claims.role === "anon") return send(res, 400, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
    try {
      await rpc("_local_storage_insert", { p_bucket: bucket, p_name: name }, token);
    } catch (e) {
      return send(res, 400, { statusCode: "403", error: "Unauthorized", message: `new row violates row-level security policy (${e.message})` });
    }
    const file = join(runDir, "storage", bucket, ...rest);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    writeFileSync(typeFile(file), type);
    return send(res, 200, { Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
  }
  if (req.method === "DELETE") {
    const [bucket] = parts;
    const body = await json(req);
    const removed = [];
    for (const name of body.prefixes ?? []) {
      const n = await rpc("_local_storage_delete", { p_bucket: bucket, p_name: name }, token).catch(() => 0);
      if (n > 0) {
        rmSync(join(runDir, "storage", bucket, ...name.split("/")), { force: true });
        removed.push({ name, bucket_id: bucket });
      }
    }
    return send(res, 200, removed);
  }
  return send(res, 404, { message: "storage-stub: niet nagebootst" });
}

// ── Gateway ─────────────────────────────────────────────────────────────
http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${GATEWAY_PORT}`);
  if (req.method === "OPTIONS") return send(res, 204, undefined, req.headers["access-control-request-headers"] ? { "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] } : {});
  try {
    if (url.pathname.startsWith("/rest/v1/")) return proxy(req, res, REST_PORT, url.pathname.replace("/rest/v1", "") + url.search);
    if (url.pathname.startsWith("/auth/v1/")) return await handleAuth(req, res, url);
    if (url.pathname.startsWith("/storage/v1/object/")) return await handleStorage(req, res, url);
    if (url.pathname === "/_mailbox") {
      const to = url.searchParams.get("to");
      return send(res, 200, mailbox.filter((m) => !to || m.to === to.toLowerCase()));
    }
    if (url.pathname === "/_outbox") {
      return send(res, 200, await (await fetch(`http://127.0.0.1:${REST_PORT}/email_outbox?order=created_at.desc`, { headers: { Authorization: `Bearer ${SERVICE_KEY}` } })).json());
    }
    return send(res, 404, { message: "niet gevonden" });
  } catch (e) {
    console.error(e);
    return send(res, 500, { message: String(e) });
  }
}).listen(GATEWAY_PORT, () => {
  writeFileSync(join(root, ".env.localtest"), [
    `NEXT_PUBLIC_SUPABASE_URL=http://localhost:${GATEWAY_PORT}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}`,
    `NEXT_PUBLIC_SITE_URL=${SITE_URL}`,
    `STRIPE_SECRET_KEY=sk_test_local_not_real`,
    `STRIPE_WEBHOOK_SECRET=whsec_local_test_only`,
    `STRIPE_PRICE_PRO_MONTHLY=price_local_test`,
    `BILLING_ENABLED=false`,
    "",
  ].join("\n"));
  console.log(`gateway klaar op http://localhost:${GATEWAY_PORT} (env in .env.localtest)`);
});
