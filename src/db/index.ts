import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import * as schema from "./schema";

/**
 * Database client.
 *
 * - Neon (host contains `neon.tech`): uses the Neon serverless driver over WebSockets,
 *   which supports interactive transactions and works on Vercel.
 * - Anything else (for example a local Postgres in Docker): uses node-postgres.
 *
 * Both expose the same Drizzle query API, so the rest of the app does not care.
 */
export type DB = NodePgDatabase<typeof schema>;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  const forceNeon = process.env.DATABASE_DRIVER === "neon";
  const forcePg = process.env.DATABASE_DRIVER === "pg";
  const useNeon = forceNeon || (!forcePg && /\.neon\.tech/i.test(url));

  if (useNeon) {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString: url, max: 5 });
    return drizzleNeon({ client: pool, schema }) as unknown as DB;
  }
  const pool = new PgPool({ connectionString: url, max: 10 });
  return drizzlePg({ client: pool, schema });
}

const globalForDb = globalThis as unknown as { __crowdwinkDb?: DB };

export function getDb(): DB {
  if (!globalForDb.__crowdwinkDb) {
    globalForDb.__crowdwinkDb = createDb();
  }
  return globalForDb.__crowdwinkDb;
}

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
