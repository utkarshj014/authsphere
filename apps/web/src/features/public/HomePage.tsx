import React from "react";
import { Link } from "react-router-dom";
import { ROUTES, DOCS_URLS } from "../../routes/routes.config.js";
import { useAuthStore } from "../../stores/auth.store.js";
import { Button } from "../../components/ui/Button.js";

export const HomePage: React.FC = () => {
  const { status, user } = useAuthStore();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-accent-soft selection:text-ink">
      {/* Navigation Header */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-rule">
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
          <span className="font-display font-medium text-ink tracking-tight text-base">
            AuthSphere
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <a
            href={DOCS_URLS.SWAGGER}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-ink transition-colors px-2 py-1"
          >
            API Reference
          </a>
          <Link
            to={ROUTES.PRIVACY}
            className="text-muted hover:text-ink transition-colors px-2 py-1 hidden sm:inline-block"
          >
            Privacy
          </Link>

          {isAuthenticated ? (
            <Link to={ROUTES.APP.ROOT}>
              <Button variant="primary" size="sm">
                Console
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link to={ROUTES.LOGIN}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden xs:inline-flex"
                >
                  Sign In
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 flex-1 flex flex-col justify-center">
        <div className="max-w-2xl space-y-4 sm:space-y-6">
          <h1 className="font-display font-medium text-2xl sm:text-4xl lg:text-5xl text-ink tracking-tight leading-tight">
            Account authentication and access security.
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-muted max-w-xl leading-relaxed">
            Sign in with email, magic links, or social providers. Protect your
            account with two-factor verification, and control your active
            sessions across devices.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {isAuthenticated ? (
              <Link to={ROUTES.APP.ROOT} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  Open Console ({user?.email})
                </Button>
              </Link>
            ) : (
              <>
                <Link to={ROUTES.REGISTER} className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    Create Account
                  </Button>
                </Link>
                <Link to={ROUTES.LOGIN} className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    Sign In
                  </Button>
                </Link>
              </>
            )}
            <a
              href={DOCS_URLS.SWAGGER}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="md" className="w-full sm:w-auto">
                API Reference (Swagger)
              </Button>
            </a>
          </div>
        </div>

        {/* Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5 mt-10 sm:mt-16 pt-8 sm:pt-12 border-t border-rule">
          <div className="p-4 sm:p-5 rounded-card bg-paper-2 border border-rule space-y-1.5 sm:space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              Flexible Sign-In
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Authenticate using email and password, passwordless magic links,
              or connected Google and GitHub accounts.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-card bg-paper-2 border border-rule space-y-1.5 sm:space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              Two-Factor Protection
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Add time-based one-time password (TOTP) verification using
              standard authenticator apps to secure account access.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-card bg-paper-2 border border-rule space-y-1.5 sm:space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              Session Management
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Review current sign-in locations and devices, with the ability to
              revoke unrecognized sessions instantly.
            </p>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-rule text-xs text-muted">
        <span className="font-mono text-xs">AuthSphere</span>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-2xs sm:text-xs">
          <Link
            to={ROUTES.PRIVACY}
            className="hover:text-ink transition-colors"
          >
            Privacy Policy
          </Link>
          <a
            href={DOCS_URLS.SWAGGER}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            API Reference
          </a>
          <a
            href={DOCS_URLS.OPENAPI}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            OpenAPI Spec
          </a>
          <Link to={ROUTES.LOGIN} className="hover:text-ink transition-colors">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
};
