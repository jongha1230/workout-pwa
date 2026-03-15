import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  density?: "default" | "compact";
};

type StatPillProps = {
  label: string;
  value: string;
  icon?: LucideIcon;
  className?: string;
};

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

type EmptyStatePanelProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  meta,
  children,
  className,
  density = "default",
}: PageShellProps) {
  const isCompact = density === "compact";

  return (
    <main
      id="main-content"
      className={cn(
        "mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10",
        isCompact ? "gap-5 lg:gap-6" : "gap-6 lg:gap-8",
        className,
      )}
    >
      <section
        className={cn(
          "surface-panel hud-grid relative overflow-hidden",
          isCompact ? "px-5 py-5 sm:px-6 sm:py-6" : "px-6 py-6 sm:px-8 sm:py-8",
        )}
      >
        <div className="pointer-events-none absolute -left-8 top-6 h-28 w-28 rounded-full bg-[radial-gradient(circle,_rgba(111,255,220,0.26),_transparent_72%)] blur-xl" />
        <div className="pointer-events-none absolute -right-12 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,_rgba(255,196,86,0.15),_transparent_72%)] blur-xl" />
        <div className="pointer-events-none absolute bottom-0 right-20 h-32 w-32 rounded-full bg-[radial-gradient(circle,_rgba(108,135,255,0.14),_transparent_72%)] blur-xl" />

        <div
          className={cn(
            "relative grid lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]",
            isCompact ? "gap-4 lg:items-center" : "gap-6 lg:items-end",
          )}
        >
          <div className={cn(isCompact ? "space-y-4" : "space-y-5")}>
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(111,255,220,0.9)]" />
              <p className="brand-kicker !text-primary/85">{eyebrow}</p>
            </div>
            <div className={cn(isCompact ? "space-y-2" : "space-y-3")}>
              <h1
                className={cn(
                  "font-display font-semibold tracking-[-0.06em] text-balance text-white",
                  isCompact
                    ? "text-3xl sm:text-4xl lg:text-5xl"
                    : "text-4xl sm:text-5xl lg:text-6xl",
                )}
              >
                {title}
              </h1>
              <p
                className={cn(
                  "max-w-2xl text-white/64",
                  isCompact
                    ? "text-sm leading-6 sm:text-base"
                    : "text-base leading-7 sm:text-lg",
                )}
              >
                {description}
              </p>
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-3">{actions}</div>
            ) : null}
          </div>

          {meta ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {meta}
            </div>
          ) : null}
        </div>
      </section>

      {children}
    </main>
  );
}

export function StatPill({
  label,
  value,
  icon: Icon,
  className,
}: StatPillProps) {
  return (
    <div
      className={cn(
        "hud-chip flex min-h-24 flex-col justify-between gap-4 rounded-[1.35rem] px-5 py-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-white/44">
          {label}
        </span>
        {Icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-[0.95rem] border border-primary/16 bg-primary/12 text-primary shadow-[0_0_22px_rgba(111,255,220,0.14)]">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="font-display text-xl font-semibold tracking-[-0.05em] text-white">
        {value}
      </p>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? <p className="brand-kicker">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-6 text-white/58 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyStatePanel({
  title,
  description,
  action,
  className,
}: EmptyStatePanelProps) {
  return (
    <div
      className={cn(
        "surface-soft rounded-[1.6rem] border border-dashed border-white/12 px-6 py-8 text-left",
        className,
      )}
    >
      <div className="max-w-xl space-y-3">
        <h3 className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
          {title}
        </h3>
        <p className="text-sm leading-7 text-white/56 sm:text-base">
          {description}
        </p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
