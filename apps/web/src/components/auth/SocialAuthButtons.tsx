import React from "react";
import { OAUTH_PROVIDER_ITEMS } from "./oauthProviders.js";

export interface SocialAuthButtonsProps {
  actionText?: "Continue" | "Register";
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  actionText = "Continue",
}) => {
  return (
    <div className="space-y-2">
      {OAUTH_PROVIDER_ITEMS.map((item) => (
        <a
          key={item.provider}
          href={item.oauthUrl}
          className="w-full h-9 flex items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] hover:border-[var(--color-rule-2)] text-[var(--color-ink)] text-xs font-medium transition-colors duration-[var(--dur-micro)] active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] select-none"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d={item.iconPath} />
          </svg>
          <span>
            {actionText} with {item.shortLabel}
          </span>
        </a>
      ))}
    </div>
  );
};
