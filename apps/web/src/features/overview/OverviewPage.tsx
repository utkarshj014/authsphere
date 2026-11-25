import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store.js";
import { sessionsApi, activityApi } from "../../api/index.js";
import type { SessionItem, SecurityEventItem } from "../../types/auth.types.js";
import { Badge, Button, Skeleton } from "../../components/ui/index.js";
import { ROUTES } from "../../routes/routes.config.js";
import {
  formatEventType,
  formatDate,
  formatClient,
} from "../../utils/formatters.js";

export const OverviewPage: React.FC = () => {
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(true);
  const [isActivityForbidden, setIsActivityForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTelemetry = async () => {
      try {
        const [sessionsRes, eventsRes] = await Promise.allSettled([
          sessionsApi.getSessions(),
          activityApi.getSecurityEvents(1, 5),
        ]);

        if (!isMounted) return;

        if (sessionsRes.status === "fulfilled" && sessionsRes.value.data) {
          setSessions(sessionsRes.value.data);
        }

        if (eventsRes.status === "fulfilled" && eventsRes.value.data?.events) {
          setEvents(eventsRes.value.data.events);
          setIsActivityForbidden(false);
        } else if (
          eventsRes.status === "rejected" &&
          (eventsRes.reason as { response?: { status?: number } })?.response
            ?.status === 403
        ) {
          setEvents([]);
          setIsActivityForbidden(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTelemetry(false);
        }
      }
    };

    loadTelemetry();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentSession = sessions.find((s) => s.isCurrent);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const isEmailVerified = Boolean(user?.verifiedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
          Account Overview
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Identity posture and active authorization context
        </p>
      </div>

      {/* Dual-State Security Console Signature Panel */}
      <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--color-rule)] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-pill)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center font-display font-semibold text-sm text-[var(--color-accent)]">
              {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-medium text-base text-[var(--color-ink)]">
                  {fullName || user?.email}
                </span>
                {fullName && (
                  <span className="text-xs text-[var(--color-muted)] font-mono">
                    ({user?.email})
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--color-muted)] block mt-0.5 font-mono">
                id: {user?.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={user?.role === "ADMIN" ? "accent" : "neutral"}
              isMono
            >
              {user?.role}
            </Badge>
            <Badge variant={user?.mfaEnabled ? "ok" : "bad"} isMono>
              2FA: {user?.mfaEnabled ? "ACTIVE" : "DISABLED"}
            </Badge>
            <Badge variant={isEmailVerified ? "ok" : "accent"} isMono>
              {isEmailVerified ? "VERIFIED" : "UNVERIFIED"}
            </Badge>
          </div>
        </div>

        {/* Security Checklist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)] flex flex-col justify-between">
            <div className="text-xs text-[var(--color-muted)] font-medium">
              Two-factor authentication
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  user?.mfaEnabled
                    ? "text-[var(--color-ok)]"
                    : "text-[var(--color-bad)]"
                }`}
              >
                {user?.mfaEnabled ? "Protected (TOTP)" : "Not Enrolled"}
              </span>
              {!user?.mfaEnabled && (
                <Link to={ROUTES.APP.SECURITY}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-[10px] h-7 px-2"
                  >
                    Enable 2FA
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="p-3 bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)] flex flex-col justify-between">
            <div className="text-xs text-[var(--color-muted)] font-medium">
              Active sessions
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-[var(--color-ink)]">
                {isLoadingTelemetry
                  ? "…"
                  : `${sessions.length} Authorized Device${sessions.length === 1 ? "" : "s"}`}
              </span>
              <Link to={ROUTES.APP.SESSIONS}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-[10px] h-7 px-2"
                >
                  Review
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-3 bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)] flex flex-col justify-between">
            <div className="text-xs text-[var(--color-muted)] font-medium">
              Account created
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-mono text-[var(--color-ink-2)]">
                {formatDate(user?.createdAt)}
              </span>
              <span className="text-[10px] font-mono text-[var(--color-ok)]">
                SYSTEM VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Overview Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Session Context */}
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div>
                <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
                  Current Session Context
                </h2>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Hardware and network telemetry for this active terminal
                </p>
              </div>
              <Badge variant="ok" size="sm" isMono>
                LIVE
              </Badge>
            </div>

            {isLoadingTelemetry ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : currentSession ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)]">
                  <span className="text-[var(--color-muted)]">IP Address</span>
                  <span className="font-mono text-[var(--color-ink)] font-medium">
                    {currentSession.ipAddress || "127.0.0.1"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 p-2.5 bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)]">
                  <span className="text-[var(--color-muted)] shrink-0">
                    Client
                  </span>
                  <span
                    className="text-right text-[var(--color-ink-2)] truncate flex-1 min-w-0"
                    title={currentSession.userAgent || undefined}
                  >
                    {formatClient(currentSession.userAgent)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)]">
                  <span className="text-[var(--color-muted)]">
                    Authenticated
                  </span>
                  <span className="font-mono text-[var(--color-ink-2)]">
                    {new Date(currentSession.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-muted)] py-4 text-center">
                Session telemetry is syncing…
              </p>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-[var(--color-rule)] flex justify-end">
            <Link
              to={ROUTES.APP.SESSIONS}
              className="text-xs text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Manage all active sessions</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Recent Security Activity */}
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
              <div>
                <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
                  Recent Security Activity
                </h2>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Latest ledger audit records across your account
                </p>
              </div>
              <Badge variant="cool" size="sm" isMono>
                AUDIT
              </Badge>
            </div>

            {isLoadingTelemetry ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2 bg-[var(--color-paper-3)] rounded-[var(--radius-pill)] border border-[var(--color-rule)] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-cool)]" />
                      <span className="font-medium text-[var(--color-ink)] capitalize">
                        {formatEventType(evt.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-[var(--color-muted)]">
                        {evt.ipAddress}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--color-ink-2)]">
                        {new Date(evt.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : isActivityForbidden ? (
              <div className="p-3 bg-[var(--color-paper-3)] rounded-[var(--radius-card)] border border-[var(--color-rule)] text-center space-y-0.5">
                <p className="text-xs text-[var(--color-bad)] font-medium">
                  Activity telemetry restricted
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  Your role does not have{" "}
                  <code className="font-mono text-[10px]">dashboard.view</code>{" "}
                  permission.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-muted)] py-4 text-center">
                No recent activity events recorded.
              </p>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-[var(--color-rule)] flex justify-end">
            <Link
              to={ROUTES.APP.ACTIVITY}
              className="text-xs text-[var(--color-accent)] hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>View complete audit ledger</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
