import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "project-infra.json");
if (!fs.existsSync(manifestPath)) { console.error("Missing project-infra.json"); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!new Set(["dedicated_supabase", "legacy_shared_schema", "no_supabase"]).has(manifest.isolationMode)) {
  console.error("Invalid isolationMode in project-infra.json"); process.exit(1);
}
const expectedUrl = manifest.supabase?.url?.replace(/\/$/, "");
if (manifest.isolationMode !== "no_supabase" && !expectedUrl) {
  console.error("Missing supabase.url in project-infra.json"); process.exit(1);
}
const allowedUrls = new Set([expectedUrl, manifest.legacyException?.additionalSupabaseUrl].filter(Boolean).map((url) => url.replace(/\/$/, "")));
for (const envName of [".env", ".env.local", ".env.production", ".env.vercel.prod"]) {
  const envPath = path.join(root, envName);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^(?:VITE_|NEXT_PUBLIC_)?SUPABASE_URL=(.*)$/);
    if (!match) continue;
    const actual = match[1].trim().replace(/^[\"\x27]|[\"\x27]$/g, "").replace(/\/$/, "");
    if (!actual || /YOUR_|TU[_-]?PROYECTO/i.test(actual)) continue;
    if (manifest.isolationMode === "no_supabase") { console.error(`${envName} configures Supabase but manifest declares no_supabase`); process.exit(1); }
    if (!allowedUrls.has(actual)) { console.error(`${envName} points to unregistered Supabase URL ${actual}`); process.exit(1); }
  }
}
if (manifest.isolationMode === "legacy_shared_schema") console.warn("Legacy shared Supabase detected. Dedicated migration remains required.");
console.log(`Project isolation OK: ${manifest.projectSlug}`);

