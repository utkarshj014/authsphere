import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sessionsApi, authApi, getApiErrorMessage } from "../../api/index.js";
import { useAuthStore } from "../../stores/auth.store.js";
import type { SessionItem } from "../../types/auth.types.js";
import {
  Button,
  Alert,
  Badge,
  Modal,
  Skeleton,
} from "../../components/ui/index.js";
import { ROUTES } from "../../routes/routes.config.js";
import { formatClient, formatDate } from "../../utils/formatters.js";

export const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const clearAuthUser = useAuthStore((s) => s.clearAuthUser);

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Revoke single session state
  const [sessionToRevoke, setSessionToRevoke] = useState<SessionItem | null>(
    null,
  );
  const [isRevokingSingle, setIsRevokingSingle] = useState(false);

  // Sign out everywhere modal
  const [isSignoutEverywhereModalOpen, setIsSignoutEverywhereModalOpen] =
    useState(false);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchSessions = async () => {
      try {
        const res = await sessionsApi.getSessions();
        if (isMounted && res.data) {
          setSessions(res.data);
          setGlobalError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setGlobalError(getApiErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const res = await sessionsApi.getSessions();
      if (res.data) {
        setSessions(res.data);
      }
    } catch (err: unknown) {
      setSessions([]);
      setGlobalError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSingle = async () => {
    if (!sessionToRevoke) return;

    setIsRevokingSingle(true);
    try {
      await sessionsApi.revokeSession(sessionToRevoke.id);

      // If user revoked their current session, sign them out
      if (sessionToRevoke.isCurrent) {
        clearAuthUser();
        navigate(ROUTES.LOGIN);
        return;
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionToRevoke.id));
      setGlobalSuccess("Remote session revoked successfully.");
      setSessionToRevoke(null);
    } catch (err: unknown) {
      setSessions([]);
      setGlobalError(getApiErrorMessage(err));
    } finally {
      setIsRevokingSingle(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    setIsSigningOutEverywhere(true);
    try {
      await authApi.logoutAll();
      clearAuthUser();
      navigate(ROUTES.LOGIN);
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
      setIsSigningOutEverywhere(false);
      setIsSignoutEverywhereModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--color-rule)] gap-4">
        <div>
          <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
            Active Sessions
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Monitor and revoke active authenticated browser sessions across all
            devices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh sessions"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={isLoading ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>Refresh</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsSignoutEverywhereModalOpen(true)}
            disabled={isLoading || sessions.length === 0}
          >
            Sign Out Everywhere
          </Button>
        </div>
      </div>

      {globalSuccess && (
        <Alert variant="ok" onClose={() => setGlobalSuccess(null)}>
          {globalSuccess}
        </Alert>
      )}

      {globalError && (
        <Alert variant="bad" onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}

      {/* Sessions Ledger Card */}
      <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
          <div>
            <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
              Authorized Device Registry
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              Active sessions authenticated via HttpOnly rotating refresh tokens
            </p>
          </div>
          <Badge variant="cool" size="sm" isMono>
            {sessions.length} ACTIVE
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)] py-8 text-center">
            No active sessions found.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-[var(--radius-pill)] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  item.isCurrent
                    ? "bg-[var(--color-paper-3)] border-[var(--color-ok)]/40 shadow-xs"
                    : "bg-[var(--color-paper-3)] border-[var(--color-rule)] hover:border-[var(--color-rule-2)]"
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-medium text-sm text-[var(--color-ink)] truncate max-w-full"
                      title={item.userAgent || undefined}
                    >
                      {formatClient(item.userAgent)}
                    </span>
                    {item.isCurrent ? (
                      <Badge variant="ok" size="sm" isMono>
                        CURRENT DEVICE
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm" isMono>
                        REMOTE
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] font-mono flex-wrap">
                    <span>IP: {item.ipAddress || "127.0.0.1"}</span>
                    <span>Created: {formatDate(item.createdAt)}</span>
                    <span>Expires: {formatDate(item.expiresAt)}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  {item.isCurrent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSessionToRevoke(item)}
                      className="text-xs"
                    >
                      Sign Out
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setSessionToRevoke(item)}
                      className="text-xs"
                    >
                      Revoke Device
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoke Single Session Confirmation Modal */}
      <Modal
        isOpen={Boolean(sessionToRevoke)}
        onClose={() => setSessionToRevoke(null)}
        title={
          sessionToRevoke?.isCurrent
            ? "End Current Session?"
            : "Revoke Remote Device?"
        }
        description={
          sessionToRevoke?.isCurrent
            ? "You are about to terminate this active terminal session. You will be redirected to the sign-in screen."
            : `Terminating this session will immediately disconnect the device from IP ${sessionToRevoke?.ipAddress}.`
        }
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] text-xs font-mono space-y-1">
            <div>
              Device:{" "}
              {sessionToRevoke ? formatClient(sessionToRevoke.userAgent) : ""}
            </div>
            <div>IP Address: {sessionToRevoke?.ipAddress}</div>
            <div>
              Created:{" "}
              {sessionToRevoke
                ? new Date(sessionToRevoke.createdAt).toLocaleString()
                : ""}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSessionToRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isRevokingSingle}
              onClick={handleRevokeSingle}
            >
              {sessionToRevoke?.isCurrent
                ? "Sign Out Current Session"
                : "Confirm Revoke"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sign Out Everywhere Modal */}
      <Modal
        isOpen={isSignoutEverywhereModalOpen}
        onClose={() => setIsSignoutEverywhereModalOpen(false)}
        title="Sign Out Everywhere"
        description="Revoke all authenticated sessions across all devices."
      >
        <div className="space-y-4">
          <Alert variant="bad">
            Warning: This action will terminate ALL active sessions across every
            browser, phone, and terminal, including this current window. You
            will need to sign back in with your credentials.
          </Alert>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsSignoutEverywhereModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isSigningOutEverywhere}
              onClick={handleSignOutEverywhere}
            >
              Confirm Sign Out Everywhere
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
