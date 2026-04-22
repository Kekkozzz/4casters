import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy from Supabase Project Settings → Database → Connection string (URI).",
  );
}

// `prepare: false` is required for Supabase connection pooler (pgbouncer in transaction mode).
const queryClient = postgres(url, { prepare: false });

export const db = drizzle(queryClient, { schema });
export { schema };
