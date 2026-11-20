import React, { useState, Suspense } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store.js";
import { ROLES } from "../../types/auth.types.js";
import { ROUTES, DOCS_URLS } from "../../routes/routes.config.js";

interface NavItem {
  label: string;
  to: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    to: ROUTES.APP.ROOT,
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    label: "Security & MFA",
    to: ROUTES.APP.SECURITY,
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      </svg>
    ),
  },
  {
    label: "Active Sessions",
    to: ROUTES.APP.SESSIONS,
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    ),
  },
  {
    label: "Security Activity",
    to: ROUTES.APP.ACTIVITY,
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "User Directory",
    to: ROUTES.APP.ADMIN_USERS,
    adminOnly: true,
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Role Permissions",
    to: ROUTES.APP.ADMIN_ROLES,
    adminOnly: true,
    icon: ({ className }) => (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

export const AppShell: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const isAdmin = user?.role === ROLES.ADMIN;
  const filteredNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-paper-2 border-b border-rule sticky top-0 z-40">
        <Link to={ROUTES.APP.ROOT} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-pill bg-paper-3 border border-rule flex items-center justify-center text-accent">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="font-display font-medium text-sm text-ink">
            AuthSphere
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-pill bg-paper-3 border border-rule text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Toggle Navigation"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            {mobileMenuOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M4 12h16M4 6h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Slide-Over Backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-paper-2 border-r border-rule flex flex-col justify-between transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-rule flex items-center justify-between">
            <Link to={ROUTES.APP.ROOT} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule flex items-center justify-center text-accent">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <span className="font-display font-medium text-ink tracking-tight text-sm">
                  AuthSphere
                </span>
                <span className="block text-xs font-mono text-muted">
                  Control Plane
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-pill text-muted hover:text-ink"
              aria-label="Close Navigation Menu"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-xs font-medium text-muted">
              Navigation
            </div>
            {filteredNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ROUTES.APP.ROOT}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-pill text-sm transition-colors ${
                    isActive
                      ? "bg-accent/15 text-accent font-medium border border-accent/30"
                      : "text-muted hover:text-ink hover:bg-paper-3"
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Developer & API Resources */}
            <div className="pt-4 pb-1 px-3 text-xs font-medium text-muted">
              Developer
            </div>
            <a
              href={DOCS_URLS.SWAGGER}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-pill text-sm text-muted hover:text-ink hover:bg-paper-3 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
                <span>API Reference</span>
              </div>
              <span className="text-xs font-mono text-muted/60 group-hover:text-accent">
                ↗
              </span>
            </a>
            <a
              href={DOCS_URLS.OPENAPI}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-pill text-sm text-muted hover:text-ink hover:bg-paper-3 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                <span>OpenAPI 3.1 Spec</span>
              </div>
              <span className="text-xs font-mono text-muted/60 group-hover:text-accent">
                ↗
              </span>
            </a>
          </nav>
        </div>

        {/* User Identity & Sign Out Footer */}
        <div className="p-4 border-t border-rule space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-pill bg-paper-3 border border-rule flex items-center justify-center font-mono text-xs text-accent font-medium shrink-0">
              {(user?.email?.charAt(0) || "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-ink truncate">
                {user?.email}
              </span>
              <span
                className={`inline-block text-3xs font-mono px-1.5 py-0.2 rounded-pill border ${
                  isAdmin
                    ? "bg-accent/15 border-accent/30 text-accent font-medium"
                    : "bg-paper-3 border-rule text-muted"
                }`}
              >
                {user?.role || "USER"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-pill text-xs text-muted hover:text-bad border border-rule hover:border-bad/40 bg-paper-3 transition-colors active:scale-98 whitespace-nowrap"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <Suspense
            fallback={
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 bg-[var(--color-paper-3)] rounded" />
                <div className="h-4 w-72 bg-[var(--color-paper-3)] rounded" />
                <div className="h-64 w-full bg-[var(--color-paper-3)] rounded mt-6" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
