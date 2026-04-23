import { listEvents } from "@/lib/data/events";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await listEvents();
  return <EventsClient events={events} />;
}
