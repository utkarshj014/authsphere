import React, { useEffect, useState } from "react";
import { adminApi, getApiErrorMessage } from "../../api/index.js";
import {
  PERMISSIONS,
  type RoleName,
  type PermissionName,
} from "../../types/auth.types.js";
import { Button, Alert, Badge, Skeleton } from "../../components/ui/index.js";

const ALL_AVAILABLE_PERMISSIONS: Array<{
  name: PermissionName;
  label: string;
  category: string;
  description: string;
}> = [
  {
    name: PERMISSIONS.PROFILE_READ,
    label: "profile.read",
    category: "Identity & Profile",
    description: "Read own authenticated identity profile and account details.",
  },
  {
    name: PERMISSIONS.PROFILE_UPDATE,
    label: "profile.update",
    category: "Identity & Profile",
    description: "Modify own profile attributes (name, contact metadata).",
  },
  {
    name: PERMISSIONS.DASHBOARD_VIEW,
    label: "dashboard.view",
    category: "Telemetry & Overview",
    description:
      "Access account overview, active sessions, and security activity telemetry.",
  },
  {
    name: PERMISSIONS.USER_READ,
    label: "user.read",
    category: "User Directory",
    description:
      "Query and inspect the global directory of registered user identities.",
  },
  {
    name: PERMISSIONS.USER_CREATE,
    label: "user.create",
    category: "User Directory",
    description:
      "Provision new user identities directly through administrative tools.",
  },
  {
    name: PERMISSIONS.USER_UPDATE,
    label: "user.update",
    category: "User Directory",
    description:
      "Update user account attributes and authorization assignments.",
  },
  {
    name: PERMISSIONS.USER_DELETE,
    label: "user.delete",
    category: "User Directory",
    description: "Deprovision and permanently delete user accounts.",
  },
  {
    name: PERMISSIONS.ROLE_MANAGE,
    label: "role.manage",
    category: "Role Governance",
    description: "Modify persisted role-to-permission security mappings.",
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

  const handleTogglePermission = (perm: PermissionName) => {
    if (activeRole === "ADMIN") return; // Admin permissions immutable

    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSavePermissions = async () => {
    if (activeRole === "ADMIN") return;

    setIsSaving(true);
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      const res = await adminApi.updateRolePermissions(activeRole, permissions);
      if (res.data) {
        setPermissions(res.data.permissions);
        setInitialPermissions(res.data.permissions);
      }
      setGlobalSuccess(
        `Permissions for ${activeRole} updated successfully. Changes apply globally to all users assigned this role.`,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--color-rule)] gap-4">
        <div>
          <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
            Role Permissions
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Inspect role capabilities and configure permissions applied globally
            across all assigned users
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
            Save USER Permissions
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
          ADMIN permissions are permanently immutable. The system grants full
          authorization to administrators across all operational domains.
        </Alert>
      ) : (
        <Alert variant="warn" title="Global Scope Notice">
          Changes made here alter authorization tokens and policy enforcement
          globally for all existing and future users assigned the USER role.
        </Alert>
      )}

      {/* Permissions List Card */}
      <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
          <div>
            <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
              Authorized Capabilities for {activeRole}
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              {permissions.length} of {ALL_AVAILABLE_PERMISSIONS.length}{" "}
              capabilities granted
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
            {ALL_AVAILABLE_PERMISSIONS.map((perm) => {
              const isChecked = permissions.includes(perm.name);
              const isDisabled = activeRole === "ADMIN";

              return (
                <label
                  key={perm.name}
                  className={`flex items-start gap-3 py-3.5 px-2 rounded-[var(--radius-pill)] transition-colors select-none ${
                    isDisabled
                      ? "cursor-default opacity-85"
                      : "cursor-pointer hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => handleTogglePermission(perm.name)}
                    className="mt-1 h-4 w-4 rounded border-[var(--color-rule)] text-[var(--color-accent)] focus:ring-[var(--color-focus)] cursor-pointer disabled:cursor-default"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--color-ink)]">
                        {perm.label}
                      </span>
                      <span className="text-[11px] text-[var(--color-muted)] font-normal">
                        ({perm.category})
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-ink-2)] mt-0.5">
                      {perm.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {activeRole === "USER" && hasUnsavedChanges && (
          <div className="flex items-center justify-between p-3 bg-[var(--color-paper-3)] border border-[var(--color-accent)]/30 rounded-[var(--radius-pill)] mt-4">
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
