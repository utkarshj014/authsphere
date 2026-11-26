import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store.js";
import { ROUTES } from "../routes.config.js";

export const AuthGuard: React.FC = () => {
  const { status, sessionExpired, bootstrapAuth } = useAuthStore();
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-paper-2 border border-rule rounded-card space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-pill bg-paper-3" />
            <div className="h-4 bg-paper-3 rounded w-32" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-paper-3 rounded w-full" />
            <div className="h-3 bg-paper-3 rounded w-3/4" />
          </div>
          <div className="pt-2">
            <div className="h-9 bg-paper-3 rounded-pill w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h2 className="font-display font-medium text-lg text-ink">
            Service Unavailable
          </h2>
          <p className="text-sm text-muted">
            Unable to connect to the AuthSphere authentication server. The
            backend service may be starting up or temporarily offline.
          </p>
          <button
            type="button"
            onClick={() => bootstrapAuth()}
            className="w-full h-9 px-4 rounded-pill bg-accent text-accent-ink font-medium text-sm hover:brightness-105 active:scale-98 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    const params = new URLSearchParams();
    if (sessionExpired) {
      params.set("session_expired", "true");
    }
    params.set("returnTo", location.pathname + location.search);
    return <Navigate to={`${ROUTES.LOGIN}?${params.toString()}`} replace />;
  }

  return <Outlet />;
};
