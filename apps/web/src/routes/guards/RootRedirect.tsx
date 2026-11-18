import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store.js";
import { ROUTES } from "../routes.config.js";

/**
 * Root redirection component evaluating initial session state
 */
export const RootRedirect: React.FC = () => {
  const { status } = useAuthStore();

  if (status === "loading" || status === "idle") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-pill border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === "authenticated") {
    return <Navigate to={ROUTES.APP.ROOT} replace />;
  }

  return <Navigate to={ROUTES.LOGIN} replace />;
};
