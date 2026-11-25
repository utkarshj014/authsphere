import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store.js";
import {
  ROLES,
  type RoleName,
  type PermissionName,
} from "../../types/auth.types.js";
import { ROUTES } from "../routes.config.js";

interface RoleGuardProps {
  allowedRole?: RoleName;
  requiredPermission?: PermissionName;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRole = ROLES.ADMIN,
  requiredPermission,
}) => {
  const { user } = useAuthStore();

  const isRoleAllowed = user?.role === allowedRole;
  const isPermissionAllowed = requiredPermission
    ? (user?.permissions?.includes(requiredPermission) ?? false)
    : false;

  if (!isRoleAllowed && !isPermissionAllowed) {
    return (
      <div className="py-12 px-4 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-pill bg-bad-soft border border-bad/30 flex items-center justify-center text-bad mb-4">
          <svg
            className="w-6 h-6"
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
        <span className="font-mono text-xs text-bad mb-1">
          Access Denied · 403 Forbidden
        </span>
        <h2 className="font-display font-medium text-xl text-ink mb-2">
          {requiredPermission
            ? "Permission Required"
            : "Administrative Role Required"}
        </h2>
        <p className="text-sm text-muted mb-6 leading-relaxed max-w-md">
          {requiredPermission
            ? `Your role does not have permission to access this resource (${requiredPermission}). An administrator can configure role permissions in Role Governance.`
            : `Your role (${user?.role || "USER"}) does not have administrative privileges to access this resource. An administrator can configure role assignments.`}
        </p>
        <Link
          to={ROUTES.APP.ROOT}
          className="h-9 px-5 rounded-pill bg-accent text-accent-ink font-medium text-sm flex items-center justify-center hover:brightness-105 active:scale-98 transition-colors"
        >
          Return to Overview
        </Link>
      </div>
    );
  }

  return <Outlet />;
};
