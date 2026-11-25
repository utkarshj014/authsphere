import React, { useEffect, useState } from "react";
import { adminApi, getApiErrorMessage } from "../../api/index.js";
import {
  PERMISSIONS,
  type RoleName,
  type PermissionName,
} from "../../types/auth.types.js";
import { Button, Alert, Badge, Skeleton } from "../../components/ui/index.js";

interface RolePermissionDef {
  name: PermissionName;
  label: string;
  category: string;
  description: string;
  badgeLabel: string;
  badgeVariant: "ok" | "cool" | "accent" | "neutral";
  isImmutable?: boolean;
}

const USER_ROLE_PERMISSIONS: RolePermissionDef[] = [
  {
    name: PERMISSIONS.PROFILE_READ,
    label: "profile.read",
    category: "Identity",
    description:
      "Read own authenticated account details and identity attributes.",
    badgeLabel: "Base · Locked",
    badgeVariant: "cool",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.DASHBOARD_VIEW,
    label: "dashboard.view",
    category: "Telemetry",
    description:
      "Access account overview, active sessions, and security activity log.",
    badgeLabel: "Active",
    badgeVariant: "ok",
    isImmutable: false,
  },
  {
    name: PERMISSIONS.USER_READ,
    label: "user.read",
    category: "Directory",
    description:
      "Browse registered users and organization members in the directory.",
    badgeLabel: "Active",
    badgeVariant: "ok",
    isImmutable: false,
  },
  {
    name: PERMISSIONS.PROFILE_UPDATE,
    label: "profile.update",
    category: "Identity",
    description:
      "Self-service updates to name and personal contact information.",
    badgeLabel: "Roadmap",
    badgeVariant: "neutral",
    isImmutable: false,
  },
];

const ADMIN_ROLE_PERMISSIONS: RolePermissionDef[] = [
  {
    name: PERMISSIONS.ROLE_MANAGE,
    label: "role.manage",
    category: "Governance",
    description:
      "Modify role-to-permission mappings and global security policies.",
    badgeLabel: "System",
    badgeVariant: "accent",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.USER_READ,
    label: "user.read",
    category: "Directory",
    description: "Query and inspect full user directory and identity records.",
    badgeLabel: "Active",
    badgeVariant: "ok",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.DASHBOARD_VIEW,
    label: "dashboard.view",
    category: "Telemetry",
    description:
      "Access security activity audit logs and operational telemetry.",
    badgeLabel: "Active",
    badgeVariant: "ok",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.PROFILE_READ,
    label: "profile.read",
    category: "Identity",
    description: "Read administrator identity and credentials status.",
    badgeLabel: "Base",
    badgeVariant: "cool",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.USER_CREATE,
    label: "user.create",
    category: "Directory",
    description:
      "Provision new user accounts directly through administrative tools.",
    badgeLabel: "Roadmap",
    badgeVariant: "neutral",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.USER_UPDATE,
    label: "user.update",
    category: "Directory",
    description:
      "Modify user account attributes, emails, and authorization assignments.",
    badgeLabel: "Roadmap",
    badgeVariant: "neutral",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.USER_DELETE,
    label: "user.delete",
    category: "Directory",
    description: "Deprovision and permanently remove user accounts.",
    badgeLabel: "Roadmap",
    badgeVariant: "neutral",
    isImmutable: true,
  },
  {
    name: PERMISSIONS.PROFILE_UPDATE,
    label: "profile.update",
    category: "Identity",
    description: "Modify personal profile attributes.",
    badgeLabel: "Roadmap",
    badgeVariant: "neutral",
    isImmutable: true,
  },
];

export const AdminRolesPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<RoleName>("USER");
  const [permissions, setPermissions] = useState<PermissionName[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<
    PermissionName[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRolePermissions = async () => {
      try {
        const res = await adminApi.getRolePermissions(activeRole);
        if (isMounted && res.data) {
          setPermissions(res.data.permissions);
          setInitialPermissions(res.data.permissions);
          setGlobalError(null);
          setGlobalSuccess(null);
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

    void fetchRolePermissions();

    return () => {
      isMounted = false;
    };
  }, [activeRole]);

  const displayedPermissions =
    activeRole === "ADMIN" ? ADMIN_ROLE_PERMISSIONS : USER_ROLE_PERMISSIONS;

  const handleTogglePermission = (perm: RolePermissionDef) => {
    if (activeRole === "ADMIN" || perm.isImmutable) return;

    setPermissions((prev) =>
      prev.includes(perm.name)
        ? prev.filter((p) => p !== perm.name)
        : [...prev, perm.name],
    );
  };

  const handleSavePermissions = async () => {
    if (activeRole === "ADMIN") return;

    setIsSaving(true);
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      // Ensure base immutable permission profile.read is always preserved
      const payloadPermissions = Array.from(
        new Set([...permissions, PERMISSIONS.PROFILE_READ]),
      );
      const res = await adminApi.updateRolePermissions(
        activeRole,
        payloadPermissions,
      );
      if (res.data) {
        setPermissions(res.data.permissions);
        setInitialPermissions(res.data.permissions);
      }
      setGlobalSuccess(
        `Permissions for ${activeRole} updated successfully. Active sessions will pick up changes on their next request.`,
      );
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges =
    activeRole !== "ADMIN" &&
    (permissions.length !== initialPermissions.length ||
      permissions.some((p) => !initialPermissions.includes(p)));

  const grantedCount = permissions.filter((p) =>
    displayedPermissions.some((d) => d.name === p),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--color-rule)] gap-4">
        <div>
          <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
            Role Permissions
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Review and configure access permissions assigned to system roles
          </p>
        </div>

        {activeRole === "USER" && (
          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            disabled={!hasUnsavedChanges}
            onClick={handleSavePermissions}
          >
            Save Changes
          </Button>
        )}
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

      {/* Architecture Overview Banner */}
      <div className="p-4 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          <h2 className="font-medium text-xs text-[var(--color-ink)]">
            Authorization Architecture
          </h2>
        </div>
        <p className="text-xs text-[var(--color-muted)] leading-relaxed">
          AuthSphere uses role-based guards for route boundaries and
          fine-grained permissions for API endpoints. Permissions are cached in
          Redis and invalidated immediately when updated here.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="flex border-b border-[var(--color-rule)] gap-4">
        <button
          type="button"
          onClick={() => setActiveRole("USER")}
          className={`pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeRole === "USER"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          USER Role (Configurable)
        </button>
        <button
          type="button"
          onClick={() => setActiveRole("ADMIN")}
          className={`pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeRole === "ADMIN"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          ADMIN Role (Immutable)
        </button>
      </div>

      {/* Role Notice */}
      {activeRole === "ADMIN" ? (
        <Alert variant="info" title="System Invariant">
          ADMIN permissions are permanently fixed. Administrators hold full
          capabilities across all domains.
        </Alert>
      ) : (
        <Alert variant="info" title="Global Scope">
          Changes made here take effect immediately across all active sessions
          assigned the USER role via Redis cache invalidation.
        </Alert>
      )}

      {/* Permissions List Card */}
      <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
          <div>
            <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
              {activeRole === "ADMIN"
                ? "Administrator Capabilities"
                : "User Capabilities"}
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              {grantedCount} of {displayedPermissions.length} capabilities
              granted
            </p>
          </div>
          <Badge
            variant={activeRole === "ADMIN" ? "accent" : "neutral"}
            size="sm"
            isMono
          >
            {activeRole}
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-rule)]">
            {displayedPermissions.map((perm) => {
              const isChecked = permissions.includes(perm.name);
              const isDisabled = activeRole === "ADMIN" || perm.isImmutable;

              return (
                <label
                  key={perm.name}
                  className={`flex items-start gap-3 py-3 px-2 rounded-lg transition-colors select-none ${
                    isDisabled
                      ? "cursor-default opacity-85"
                      : "cursor-pointer hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => handleTogglePermission(perm)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--color-rule)] text-[var(--color-accent)] focus:ring-[var(--color-focus)] cursor-pointer disabled:cursor-default"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[var(--color-ink)]">
                        {perm.label}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted)] font-normal">
                        ({perm.category})
                      </span>
                      <Badge variant={perm.badgeVariant} size="sm" isMono>
                        {perm.badgeLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      {perm.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {activeRole === "USER" && hasUnsavedChanges && (
          <div className="flex items-center justify-between p-3 bg-[var(--color-paper-3)] border border-[var(--color-accent)]/30 rounded-lg mt-4">
            <span className="text-xs text-[var(--color-accent)] font-medium">
              You have unsaved permission changes.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPermissions(initialPermissions)}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSaving}
                onClick={handleSavePermissions}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
