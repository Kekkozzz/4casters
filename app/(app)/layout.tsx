import { Sidebar } from "@/components/shell/sidebar";

/**
 * Shell layout for authenticated app routes. Route group `(app)`
 * is invisible in URLs; only /events, /matches/[id], /sheets,
 * /saved, /settings inherit this sidebar frame.
 *
 * /login stays outside the group — chromeless landing page.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
