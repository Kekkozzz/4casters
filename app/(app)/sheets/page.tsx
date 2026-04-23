import { listPersistedSheets } from "@/lib/data/sheets";
import { SheetsClient } from "./sheets-client";

export const dynamic = "force-dynamic";

export default async function MySheetsPage() {
  const sheets = await listPersistedSheets();
  return <SheetsClient sheets={sheets} />;
}
