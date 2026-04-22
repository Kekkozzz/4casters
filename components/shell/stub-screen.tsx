import { PageHeader } from "@/components/ui/page-header";

/**
 * Placeholder screen used for `/saved`, `/settings`, and any future
 * route that exists but hasn't been fleshed out. Respects the global
 * "empty state: single sentence + single action" rule from the prototype.
 */
export function StubScreen({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} />
      <div className="px-8 py-20 flex flex-col items-center text-center">
        <div className="text-[13px] text-mute max-w-sm mb-4">{message}</div>
        {action}
      </div>
    </>
  );
}
