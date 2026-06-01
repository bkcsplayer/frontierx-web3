"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--accent-blue)] bg-[linear-gradient(135deg,var(--accent-blue),var(--accent-purple))] text-white shadow-[0_0_28px_rgba(59,130,246,0.28)] hover:shadow-[0_0_38px_rgba(139,92,246,0.34)]",
  secondary:
    "border-[var(--border-strong)] bg-[var(--glass-bg)] text-[var(--text-primary)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]",
  ghost:
    "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]",
  danger:
    "border-[var(--accent-red)] bg-[rgba(239,68,68,0.12)] text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.18)]",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
