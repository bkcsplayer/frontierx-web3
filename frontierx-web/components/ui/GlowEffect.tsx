import { cn } from "@/lib/utils/cn";

export function GlowEffect({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.28),transparent_68%)] blur-3xl",
        className,
      )}
      aria-hidden
    />
  );
}
