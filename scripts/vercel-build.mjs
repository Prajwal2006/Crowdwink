// Vercel build: apply pending SQL migrations, then build Next.js.
// Set SKIP_DB_MIGRATIONS=1 (e.g. for preview deployments sharing the production
// database) to build without migrating.
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.SKIP_DB_MIGRATIONS === "1") {
  console.log("[vercel-build] SKIP_DB_MIGRATIONS=1, not running migrations");
} else if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  console.error(
    "[vercel-build] DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables " +
      "(or connect the Neon integration), then redeploy.",
  );
  process.exit(1);
} else {
  console.log("[vercel-build] applying database migrations");
  run("npx", ["drizzle-kit", "migrate"]);
}

run("npx", ["next", "build"]);
