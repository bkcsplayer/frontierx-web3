import { cn } from "@/lib/utils/cn";

export function Loading({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-3 text-sm text-[var(--text-secondary)]", className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent-cyan)]" />
      <span>{label}</span>
    </div>
  );
}
