import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage, isRequestCanceled } from "../api/index.js";

interface UseAbortableQueryOptions<T> {
  queryKey: string | number;
  fetcher: (signal: AbortSignal) => Promise<T>;
  formatError?: (err: unknown) => string;
  /** Keep existing data visible when a background refresh fails with a non-403 transient error. */
  preserveDataOnRefreshError?: boolean;
}

/**
 * Shared abort-aware query hook handling request deduplication,
 * stale cancellation on route/key transitions, and background refresh state.
 */
export function useAbortableQuery<T>({
  queryKey,
  fetcher,
  formatError = getApiErrorMessage,
  preserveDataOnRefreshError = false,
}: UseAbortableQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  const formatErrorRef = useRef(formatError);
  const activeControllerRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    fetcherRef.current = fetcher;
    formatErrorRef.current = formatError;
  }, [fetcher, formatError]);

  const execute = useCallback(
    async (controller: AbortController, isBackground = false) => {
      try {
        const result = await fetcherRef.current(controller.signal);
        if (!controller.signal.aborted) {
          hasDataRef.current = true;
          setData(result);
          setError(null);
        }
      } catch (err: unknown) {
        if (isRequestCanceled(err) || controller.signal.aborted) return;

        const status = (err as { response?: { status?: number } }).response
          ?.status;
        if (
          !isBackground ||
          !preserveDataOnRefreshError ||
          !hasDataRef.current ||
          status === 403
        ) {
          hasDataRef.current = false;
          setData(null);
        }
        setError(formatErrorRef.current(err));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [preserveDataOnRefreshError],
  );

  useEffect(() => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    const run = async () => {
      await execute(controller, false);
    };
    void run();

    return () => {
      controller.abort();
    };
  }, [queryKey, execute]);

  const refresh = useCallback(() => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    setIsRefreshing(true);
    void execute(controller, true);
  }, [execute]);

  const startKeyTransition = useCallback(() => {
    setIsRefreshing(true);
  }, []);

  return {
    data,
    setData,
    error,
    setError,
    isLoading,
    isRefreshing,
    refresh,
    startKeyTransition,
  };
}
