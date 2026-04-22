import Link from "next/link";
import { StubScreen } from "@/components/shell/stub-screen";
import { Btn } from "@/components/ui/primitives";

export default function SavedPlayersPage() {
  return (
    <StubScreen
      title="Saved Players"
      message="You haven't saved any players yet. Star a player on any sheet to follow their stats across matches."
      action={
        <Link href="/events">
          <Btn variant="primary" size="md">
            Browse events
          </Btn>
        </Link>
      }
    />
  );
}
