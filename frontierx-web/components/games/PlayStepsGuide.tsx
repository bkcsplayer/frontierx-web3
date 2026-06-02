"use client";

import { cn } from "@/lib/utils/cn";

export type PlayStep = {
  title: string;
  body: string;
};

type PlayStepsGuideProps = {
  title: string;
  steps: PlayStep[];
  currentStep?: number;
};

export function PlayStepsGuide({ title, steps, currentStep }: PlayStepsGuideProps) {
  return (
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-white/[0.03] p-5">
      <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isComplete = currentStep !== undefined && stepNumber < currentStep;

          return (
            <li
              key={step.title}
              className={cn(
                "flex gap-4 rounded-2xl border p-4 transition",
                isActive
                  ? "border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.08)]"
                  : isComplete
                    ? "border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.06)]"
                    : "border-[var(--border-subtle)] bg-black/20",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-[var(--font-jetbrains-mono)] text-sm font-bold",
                  isActive
                    ? "bg-[var(--accent-cyan)] text-black"
                    : isComplete
                      ? "bg-[rgba(16,185,129,0.2)] text-[var(--accent-green)]"
                      : "bg-white/[0.06] text-[var(--text-muted)]",
                )}
                aria-hidden
              >
                {stepNumber}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
