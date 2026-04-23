import "dotenv/config";
import postgres from "postgres";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/reset-event.mjs <event_slug>");
  process.exit(2);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const rows = await sql`DELETE FROM events WHERE id = ${slug} RETURNING id`;
console.log(`deleted ${rows.length} event(s) for slug=${slug}`);
await sql.end();
