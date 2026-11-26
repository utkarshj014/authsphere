import React from "react";
import { Navigate, useSearchParams, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store.js";
import { resolvePostAuthRedirect } from "../routes.config.js";

export const GuestGuard: React.FC = () => {
  const status = useAuthStore((s) => s.status);
  const [searchParams] = useSearchParams();

  if (status === "authenticated") {
    const returnTo = resolvePostAuthRedirect(searchParams.get("returnTo"));
    return <Navigate to={returnTo} replace />;
  }

  return <Outlet />;
};
