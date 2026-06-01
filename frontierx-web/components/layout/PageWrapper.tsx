import type { ReactNode } from "react";

export function PageWrapper({ children }: { children: ReactNode }) {
  return <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">{children}</main>;
}
