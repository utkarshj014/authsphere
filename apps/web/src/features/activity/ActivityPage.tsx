import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { activityApi, getApiErrorMessage } from "../../api/index.js";
import type {
  SecurityEventItem,
  PaginationMeta,
} from "../../types/auth.types.js";
import {
  Button,
  Alert,
  Badge,
  Skeleton,
  Pagination,
} from "../../components/ui/index.js";
import { formatEventType, formatDateTime } from "../../utils/formatters.js";

export const ActivityPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const res = await activityApi.getSecurityEvents(currentPage, 20);
        if (isMounted && res.data) {
          setEvents(res.data.events);
          setPagination(res.data.pagination);
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

    void fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const res = await activityApi.getSecurityEvents(currentPage, 20);
      if (res.data) {
        setEvents(res.data.events);
        setPagination(res.data.pagination);
      }
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
  };

  const getEventBadgeVariant = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("LOGIN") || t.includes("VERIFY")) return "ok";
    if (t.includes("LOGOUT") || t.includes("REVOKE")) return "bad";
    if (t.includes("PASSWORD") || t.includes("MFA")) return "accent";
    return "cool";
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
          disabled={isLoading}
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
            className={isLoading ? "animate-spin" : ""}
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
                    <td className="py-3 px-3 text-[var(--color-muted)] max-w-xs truncate">
                      {evt.userAgent || "Unknown client"}
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
