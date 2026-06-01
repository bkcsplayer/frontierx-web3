import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--glass-border)] bg-[var(--bg-card)] shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
