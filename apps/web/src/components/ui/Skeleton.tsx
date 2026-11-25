import React from "react";

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse bg-[var(--color-paper-3)] border border-[var(--color-rule)]/50 rounded-[var(--radius-pill)] ${className}`}
      aria-hidden="true"
    />
  );
};
