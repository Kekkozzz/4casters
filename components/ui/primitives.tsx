import * as React from "react";
import { cn } from "@/lib/cn";

type BtnVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "link";
type BtnSize = "sm" | "md" | "lg";

const btnSizes: Record<BtnSize, string> = {
  sm: "h-7 px-2.5 text-[12px]",
  md: "h-8 px-3 text-[13px]",
  lg: "h-10 px-4 text-[14px]",
};

const btnVariants: Record<BtnVariant, string> = {
  primary:   "bg-accent hover:bg-accentD text-white border border-[#5A97FF]",
  secondary: "bg-surf2 hover:bg-[#222834] text-fg border border-line2",
  ghost:     "bg-transparent hover:bg-surf1 text-fg border border-transparent",
  outline:   "bg-transparent hover:bg-surf1 text-fg border border-line2",
  danger:    "bg-transparent hover:bg-[#2a1b1a] text-bad border border-[#3a2422]",
  link:      "text-accent hover:text-[#7AAEFF] bg-transparent border-0 px-0",
};

export interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(
  (
    { variant = "secondary", size = "md", icon, iconRight, className, children, ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 t150 font-medium rounded-btn select-none",
        btnSizes[size],
        btnVariants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  ),
);
Btn.displayName = "Btn";

type PillTone = "neutral" | "accent" | "ok" | "warn" | "bad" | "tier";

const pillTones: Record<PillTone, string> = {
  neutral: "bg-[#141821] text-[#B9BEC7] border-line2",
  accent:  "bg-[#131C2E] text-[#9AB4E8] border-[#2A3B5E]",
  ok:      "bg-[#12241B] text-ok border-[#1E3A2A]",
  warn:    "bg-[#2A2314] text-warn border-[#3E331E]",
  bad:     "bg-[#2A1817] text-bad border-[#3E2322]",
  tier:    "bg-transparent text-fg border-line2",
};

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}

export function Pill({ tone = "neutral", className, children, ...rest }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 h-[20px] rounded-[4px] text-[11px] font-medium border",
        pillTones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surf1 border border-line rounded-card",
        hoverable && "t150 hover:border-line2 hover:bg-[#161A21]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface SourceChipProps {
  url: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SourceChip({ url, icon, children, className }: SourceChipProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={cn(
        "src mono inline-flex items-center gap-1 text-[11px] text-mute hover:text-[#9AB4E8] t150",
        className,
      )}
    >
      {icon}
      <span className="text-[10.5px]">source:</span>
      <u style={{ textDecorationColor: "#3E4756", textUnderlineOffset: "2px" }}>
        {children ?? url}
      </u>
    </a>
  );
}
