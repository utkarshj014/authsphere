import React from "react";

export interface BadgeProps {
  variant?: "ok" | "bad" | "cool" | "accent" | "neutral";
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
  isMono?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  children,
  className = "",
  isMono = false,
}) => {
  const variantStyles = {
    ok: "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border-[var(--color-ok)]/30",
    bad: "bg-[var(--color-bad-soft)] text-[var(--color-bad)] border-[var(--color-bad)]/30",
    cool: "bg-[var(--color-cool-soft)] text-[var(--color-cool)] border-[var(--color-cool)]/30",
    accent:
      "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent)]/30",
    neutral:
      "bg-[var(--color-paper-3)] text-[var(--color-ink-2)] border-[var(--color-rule)]",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px] leading-tight",
    md: "px-2.5 py-1 text-xs leading-none",
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-medium border rounded-[4px] select-none ${
        isMono ? "font-mono" : ""
      } ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
