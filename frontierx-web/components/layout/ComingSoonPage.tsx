import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { GlowEffect } from "@/components/ui/GlowEffect";

type ComingSoonPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function ComingSoonPage({ eyebrow, title, description, icon: Icon }: ComingSoonPageProps) {
  return (
    <PageWrapper>
      <div className="grid-overlay absolute inset-0 opacity-35" aria-hidden />
      <GlowEffect className="left-1/2 top-12 h-[460px] w-[460px] -translate-x-1/2" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-145px)] max-w-4xl items-center px-6 py-20 lg:px-8">
        <Card className="w-full p-8 md:p-12">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--glass-bg)] text-[var(--accent-cyan)]">
            <Icon className="h-7 w-7" aria-hidden />
          </div>
          <p className="font-[var(--font-jetbrains-mono)] text-sm uppercase tracking-[0.28em] text-[var(--accent-cyan)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-2xl font-[var(--font-orbitron)] text-4xl font-bold uppercase tracking-[0.08em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">{description}</p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center rounded-full border border-[var(--border-strong)] px-6 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
          >
            Back to command center
          </Link>
        </Card>
      </section>
    </PageWrapper>
  );
}
