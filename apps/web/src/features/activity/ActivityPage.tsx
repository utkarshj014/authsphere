import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  activityApi,
  DEFAULT_PAGE_SIZE,
  EMPTY_PAGINATION,
  formatPermissionError,
  type SecurityEventsResponseData,
} from "../../api/index.js";
import { useFocusRevalidate } from "../../hooks/useFocusRevalidate.js";
import { useAbortableQuery } from "../../hooks/useAbortableQuery.js";
import {
  Button,
  Alert,
  Badge,
  Skeleton,
  Pagination,
} from "../../components/ui/index.js";
import {
  formatEventType,
  formatDateTime,
  formatClient,
  getEventBadgeVariant,
} from "../../utils/formatters.js";

export const ActivityPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const fetchEvents = useCallback(
    async (signal: AbortSignal) =>
      (
        await activityApi.getSecurityEvents(
          currentPage,
          DEFAULT_PAGE_SIZE,
          signal,
        )
      ).data,
    [currentPage],
  );

  const formatActivityError = useCallback(
    (err: unknown) =>
      formatPermissionError(
        err,
        "dashboard.view",
        "view security activity audit logs",
      ),
    [],
  );

  const {
    data,
    error: globalError,
    setError: setGlobalError,
    isLoading,
    isRefreshing,
    refresh: handleRefresh,
    startKeyTransition,
  } = useAbortableQuery<SecurityEventsResponseData>({
    queryKey: currentPage,
    fetcher: fetchEvents,
    formatError: formatActivityError,
    preserveDataOnRefreshError: true,
  });

  useFocusRevalidate(handleRefresh);

  const events = data?.events ?? [];
  const pagination = data?.pagination ?? EMPTY_PAGINATION;

  const handlePageChange = (newPage: number) => {
    startKeyTransition();
    setSearchParams({ page: newPage.toString() });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--color-rule)] gap-4">
        <div>
          <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
            Security Activity
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Immutable audit trail of authentication and security lifecycle
            events
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh events"
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
            className={isLoading || isRefreshing ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          <span>Refresh</span>
        </Button>
      </div>

      {globalError && (
        <Alert variant="bad" onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}

      {/* Audit Log Card */}
      <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
          <div>
            <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
              Activity Ledger
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              Showing page {pagination.page} of {pagination.totalPages} (
              {pagination.totalCount} total events recorded)
            </p>
          </div>
          <Badge variant="cool" size="sm" isMono>
            AUDIT
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : globalError ? (
          <div className="py-10 px-4 text-center space-y-2">
            <p className="text-xs text-[var(--color-bad)] font-mono font-medium">
              Access Restricted
            </p>
            <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed">
              {globalError}
            </p>
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)] py-8 text-center">
            No security events found in the audit registry.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-rule)] text-[11px] font-medium text-[var(--color-muted)]">
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Client / Browser</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]/60">
                {events.map((evt) => (
                  <tr
                    key={evt.id}
                    className="hover:bg-[var(--color-paper-3)] transition-colors"
                  >
                    <td className="py-3 px-3">
                      <Badge
                        variant={getEventBadgeVariant(evt.type)}
                        size="sm"
                        isMono
                      >
                        {formatEventType(evt.type)}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-[var(--color-ink)]">
                      {evt.ipAddress || "—"}
                    </td>
                    <td
                      className="py-3 px-3 text-[var(--color-ink-2)] max-w-[200px] truncate"
                      title={evt.userAgent || undefined}
                    >
                      {formatClient(evt.userAgent)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[var(--color-ink-2)] whitespace-nowrap">
                      {formatDateTime(evt.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
