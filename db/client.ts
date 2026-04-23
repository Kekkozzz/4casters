import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy: we construct the client on first use so importing this module
// (e.g. from a file that unit tests don't need the DB for) doesn't
// explode when DATABASE_URL is unset.
let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy from Supabase Project Settings → Database → Connection string (URI).",
    );
  }
  // `prepare: false` is required for Supabase connection pooler (pgbouncer in transaction mode).
  const queryClient = postgres(url, { prepare: false });
  cached = drizzle(queryClient, { schema });
  return cached;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
