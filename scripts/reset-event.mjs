import dotenv from "dotenv";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/reset-event.mjs <event_slug>");
  process.exit(2);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const rows = await sql`DELETE FROM events WHERE id = ${slug} RETURNING id`;
console.log(`deleted ${rows.length} event(s) for slug=${slug}`);
await sql.end();
