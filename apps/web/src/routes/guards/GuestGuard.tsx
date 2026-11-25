import React from "react";
import { Navigate, useSearchParams, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store.js";
import { ROUTES } from "../routes.config.js";

const isSafeLocalPath = (path: string | null): boolean => {
  if (!path) return false;
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
  );
};

export const GuestGuard: React.FC = () => {
  const { status } = useAuthStore();
  const [searchParams] = useSearchParams();

  if (status === "idle" || status === "loading") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-paper-2 border border-rule rounded-card space-y-4 animate-pulse">
          <div className="h-5 bg-paper-3 rounded w-40 mx-auto" />
          <div className="space-y-2 pt-4">
            <div className="h-9 bg-paper-3 rounded-pill w-full" />
            <div className="h-9 bg-paper-3 rounded-pill w-full" />
            <div className="h-9 bg-paper-3 rounded-pill w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    const rawReturnTo = searchParams.get("returnTo");
    const returnTo =
      isSafeLocalPath(rawReturnTo) &&
      !rawReturnTo?.startsWith(ROUTES.APP.SECURITY)
        ? (rawReturnTo as string)
        : ROUTES.APP.ROOT;

    return <Navigate to={returnTo} replace />;
  }

  return <Outlet />;
};
