import { listEvents, type EventRow } from "@/lib/data/events";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events: EventRow[] = [];
  let loadError = false;

  try {
    events = await listEvents();
  } catch (error) {
    console.error("[events/page] Failed to load events", error);
    loadError = true;
  }

  return <EventsClient events={events} loadError={loadError} />;
}
