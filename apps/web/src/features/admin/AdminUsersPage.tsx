import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi, getApiErrorMessage } from "../../api/index.js";
import { useAuthStore } from "../../stores/auth.store.js";
import type {
  AdminUserItem,
  PaginationMeta,
  RoleName,
} from "../../types/auth.types.js";
import {
  Button,
  Alert,
  Badge,
  Modal,
  Skeleton,
  Pagination,
} from "../../components/ui/index.js";
import { formatDate } from "../../utils/formatters.js";

export const AdminUsersPage: React.FC = () => {
  const currentAuthUser = useAuthStore((s) => s.user);

  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const [users, setUsers] = useState<AdminUserItem[]>([]);
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
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Role modification modal state
  const [targetUser, setTargetUser] = useState<AdminUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleName>("USER");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const res = await adminApi.getUsers(currentPage, 20);
        if (isMounted && res.data) {
          setUsers(res.data.users);
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

    void fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const res = await adminApi.getUsers(currentPage, 20);
      if (res.data) {
        setUsers(res.data.users);
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

  const handleOpenRoleModal = (userItem: AdminUserItem) => {
    setTargetUser(userItem);
    setSelectedRole(userItem.role);
    setModalError(null);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;

    if (targetUser.id === currentAuthUser?.id && selectedRole !== "ADMIN") {
      setModalError("You cannot demote your own administrator account.");
      return;
    }

    setIsUpdatingRole(true);
    setModalError(null);
    try {
      await adminApi.updateUserRole(targetUser.id, selectedRole);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, role: selectedRole } : u,
        ),
      );
      setGlobalSuccess(
        `Role for ${targetUser.email} successfully updated to ${selectedRole}.`,
      );
      setTargetUser(null);
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--color-rule)] gap-4">
        <div>
          <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
            User Directory
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Manage provisioned user accounts and assign security roles
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Refresh user directory"
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

      {/* Directory Table Card */}
      <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-rule)]">
          <div>
            <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
              Account Roster
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              Page {pagination.page} of {pagination.totalPages} (
              {pagination.totalCount} registered users)
            </p>
          </div>
          <Badge variant="accent" size="sm" isMono>
            {pagination.totalCount} IDENTITIES
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)] py-8 text-center">
            No registered users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-rule)] text-[11px] font-medium text-[var(--color-muted)]">
                  <th className="py-2.5 px-3">Identity</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Email Status</th>
                  <th className="py-2.5 px-3">2FA</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]/60">
                {users.map((u) => {
                  const isSelf = u.id === currentAuthUser?.id;
                  const fullName = [u.firstName, u.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[var(--color-paper-3)] transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-medium text-[var(--color-ink)] flex items-center gap-2">
                          <span>{fullName || u.email}</span>
                          {isSelf && (
                            <Badge variant="cool" size="sm" isMono>
                              YOU
                            </Badge>
                          )}
                        </div>
                        {fullName && (
                          <div className="text-[11px] text-[var(--color-muted)] font-mono">
                            {u.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={u.role === "ADMIN" ? "accent" : "neutral"}
                          size="sm"
                          isMono
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={u.isEmailVerified ? "ok" : "accent"}
                          size="sm"
                          isMono
                        >
                          {u.isEmailVerified ? "VERIFIED" : "UNVERIFIED"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={u.mfaEnabled ? "ok" : "bad"}
                          size="sm"
                          isMono
                        >
                          {u.mfaEnabled ? "ACTIVE" : "OFF"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--color-ink-2)] whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs h-7 px-2.5"
                          onClick={() => handleOpenRoleModal(u)}
                        >
                          Change Role
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Role Assignment Modal */}
      <Modal
        isOpen={Boolean(targetUser)}
        onClose={() => setTargetUser(null)}
        title="Modify User Role"
        description={`Update role assignment for ${targetUser?.email}`}
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          {modalError && <Alert variant="bad">{modalError}</Alert>}

          {targetUser?.id === currentAuthUser?.id && (
            <Alert variant="warn">
              Note: You are modifying your own user account. Demoting yourself
              from ADMIN is blocked to prevent accidental lockout.
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-ink-2)] select-none">
              Assigned Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole("USER")}
                disabled={targetUser?.id === currentAuthUser?.id}
                className={`p-3 rounded-[var(--radius-pill)] border text-left transition-colors ${
                  selectedRole === "USER"
                    ? "bg-[var(--color-paper-3)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                    : "bg-[var(--color-paper-3)] border-[var(--color-rule)] hover:border-[var(--color-rule-2)]"
                } ${targetUser?.id === currentAuthUser?.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="font-semibold text-xs text-[var(--color-ink)] mb-0.5 whitespace-nowrap">
                  USER
                </div>
                <div className="text-[11px] text-[var(--color-muted)]">
                  Standard access
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("ADMIN")}
                className={`p-3 rounded-[var(--radius-pill)] border text-left transition-colors cursor-pointer ${
                  selectedRole === "ADMIN"
                    ? "bg-[var(--color-paper-3)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                    : "bg-[var(--color-paper-3)] border-[var(--color-rule)] hover:border-[var(--color-rule-2)]"
                }`}
              >
                <div className="font-semibold text-xs text-[var(--color-accent)] mb-0.5 whitespace-nowrap">
                  ADMIN
                </div>
                <div className="text-[11px] text-[var(--color-muted)]">
                  Privileged access
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setTargetUser(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUpdatingRole}
              disabled={selectedRole === targetUser?.role}
            >
              Save Role Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
