import React, { Suspense } from "react";
import { Outlet, Link } from "react-router-dom";
import { ROUTES, DOCS_URLS } from "../../routes/routes.config.js";

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header / Branding */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between py-4">
        <Link to={ROUTES.ROOT} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-pill bg-paper-2 border border-rule flex items-center justify-center text-accent group-hover:border-accent transition-colors">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <span className="font-display font-medium text-ink tracking-tight text-md">
              AuthSphere
            </span>
            <span className="block text-xs font-mono text-muted">
              Control Plane
            </span>
          </div>
        </Link>
        <span className="text-2xs font-mono px-2 py-0.5 rounded-pill bg-paper-3 border border-rule text-muted">
          v1.0.0
        </span>
      </header>

      {/* Main Content Form Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-paper-2 border border-rule rounded-card p-6 sm:p-8 shadow-none">
          <Suspense
            fallback={
              <div className="space-y-4 py-6 animate-pulse">
                <div className="h-6 w-1/2 bg-[var(--color-paper-3)] rounded" />
                <div className="h-4 w-3/4 bg-[var(--color-paper-3)] rounded" />
                <div className="h-10 w-full bg-[var(--color-paper-3)] rounded mt-6" />
                <div className="h-10 w-full bg-[var(--color-paper-3)] rounded" />
                <div className="h-9 w-full bg-[var(--color-paper-3)] rounded mt-4" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Footer Notices */}
      <footer className="w-full max-w-md mx-auto py-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-xs font-mono text-muted">
          <a
            href={DOCS_URLS.SWAGGER}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            API Reference ↗
          </a>
          <span className="text-rule-2">·</span>
          <a
            href={DOCS_URLS.OPENAPI}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            OpenAPI Spec ↗
          </a>
        </div>
        <p className="text-2xs text-muted/80">
          Secured by HttpOnly session tokens &amp; Argon2id hashing.
        </p>
      </footer>
    </div>
  );
};
