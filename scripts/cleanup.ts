import "dotenv/config";
import { getDb } from "../src/db";
import { cleanupExpired } from "../src/lib/server/cleanup";

async function main() {
  const result = await cleanupExpired(getDb());
  console.log(`Deleted ${result.rooms} expired room(s) and ${result.rateLimits} stale rate-limit counter(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
