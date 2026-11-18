import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { ROUTES } from "../routes.config.js";

export const RootErrorBoundary: React.FC = () => {
  const error = useRouteError();

  let errorMessage = "An unexpected client error occurred.";
  let statusCode = "Application Error";

  if (isRouteErrorResponse(error)) {
    statusCode = `${error.status} ${error.statusText}`;
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-paper-2 border border-bad/30 rounded-card space-y-4 text-center">
        <div className="w-10 h-10 rounded-pill bg-bad-soft text-bad flex items-center justify-center mx-auto">
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <span className="text-xs font-mono text-bad block">{statusCode}</span>
        <h2 className="font-display font-medium text-lg text-ink">
          Operational Error Detected
        </h2>
        <p className="text-sm text-muted">{errorMessage}</p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 h-9 rounded-pill bg-accent text-accent-ink font-medium text-sm hover:brightness-105 active:scale-98 transition-colors"
          >
            Reload Screen
          </button>
          <Link
            to={ROUTES.APP.ROOT}
            className="flex-1 h-9 rounded-pill bg-paper-3 border border-rule text-ink font-medium text-sm flex items-center justify-center hover:bg-paper-2 active:scale-98 transition-colors"
          >
            Go to Overview
          </Link>
        </div>
      </div>
    </div>
  );
};
