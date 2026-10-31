// Start Next.js (dev of start) met de env van de lokale testgateway
// (.env.localtest, geschreven door server.mjs). Gebruik:
//   node tools/local-supabase/next-local.mjs dev
//   node tools/local-supabase/next-local.mjs start
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = { ...process.env };
for (const line of readFileSync(join(root, ".env.localtest"), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
  if (m) env[m[1]] = m[2];
}
const args = process.argv.slice(2);
const cmd = args.length ? args : ["dev"];
const portArgs = cmd[0] === "build" ? [] : ["--port", process.env.PORT ?? "3100"];
const child = spawn(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), ...cmd, ...portArgs], {
  cwd: root,
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
