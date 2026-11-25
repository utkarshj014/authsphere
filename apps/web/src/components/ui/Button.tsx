import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium transition-all duration-[var(--dur-micro)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none";

    const variantStyles = {
      primary:
        "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-105 active:brightness-95 font-semibold border border-transparent",
      secondary:
        "bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)]",
      destructive:
        "bg-[var(--color-bad-soft)] text-[var(--color-bad)] hover:brightness-110 border border-[var(--color-bad)]/30",
      outline:
        "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)]",
      ghost:
        "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] border border-transparent",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-[var(--radius-pill)] gap-1.5 min-h-[36px]",
      md: "h-9 px-4 text-sm rounded-[var(--radius-pill)] gap-2 min-h-[44px] md:min-h-[36px]",
      lg: "h-11 px-5 text-base rounded-[var(--radius-pill)] gap-2.5 min-h-[44px]",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
