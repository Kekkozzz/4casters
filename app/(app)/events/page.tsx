import { listEvents } from "@/lib/data/events";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  try {
    const events = await listEvents();
    return <EventsClient events={events} />;
  } catch (error) {
    console.error("[events/page] Failed to load events", error);
    return <EventsClient events={[]} loadError />;
  }
}
