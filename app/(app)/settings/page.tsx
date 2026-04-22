import Link from "next/link";
import { StubScreen } from "@/components/shell/stub-screen";
import { Btn } from "@/components/ui/primitives";

export default function SettingsPage() {
  return (
    <StubScreen
      title="Settings"
      message="Source credentials, export defaults, and billing live here."
      action={
        <Link href="/events">
          <Btn variant="outline" size="md">
            Back to events
          </Btn>
        </Link>
      }
    />
  );
}
