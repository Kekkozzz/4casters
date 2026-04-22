"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, List, Bookmark, Settings } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Calendar;
  /** Additional pathname prefixes that mark this item active. */
  activePrefixes?: string[];
}

const ITEMS: NavItem[] = [
  {
    href: "/events",
    label: "Events",
    icon: Calendar,
    activePrefixes: ["/events", "/matches"],
  },
  { href: "/sheets", label: "My Sheets", icon: List },
  { href: "/saved", label: "Saved Players", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(item: NavItem, pathname: string): boolean {
  const prefixes = item.activePrefixes ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function Sidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-bg flex flex-col">
      {/* Wordmark */}
      <div className="h-14 flex items-center px-5 border-b border-line">
        <div className="flex items-baseline gap-[1px]">
          <span className="mono font-semibold text-[15px] tracking-tighter2 text-fg">
            4
          </span>
          <span className="font-semibold text-[15px] tracking-tighter2 text-fg">
            casters
          </span>
          <span className="ml-2 w-1 h-1 rounded-full bg-accent translate-y-[-2px]" />
        </div>
      </div>

      {/* Nav */}
      <nav className="p-2 flex-1">
        {ITEMS.map((it) => {
          const active = isActive(it, pathname);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 h-9 rounded-btn t150 text-[13px]",
                active
                  ? "bg-surf1 text-fg"
                  : "text-[#B4B9C2] hover:bg-surf1 hover:text-fg",
              )}
            >
              <Icon size={15} className={active ? "text-accent" : ""} />
              <span className="font-medium">{it.label}</span>
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-line2 bg-surf2 flex items-center justify-center text-[11px] font-semibold">
            DA
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium truncate">Derek A.</div>
            <div className="text-[10.5px] text-mute2 mono truncate">
              derek@castercraft.gg
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="mono text-[10px] text-mute2 uppercase tracking-[0.14em]">
            v0.2.0 · beta
          </span>
          <span className="flex items-center gap-1 text-[10px] text-mute">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" /> all sources up
          </span>
        </div>
      </div>
    </aside>
  );
}
