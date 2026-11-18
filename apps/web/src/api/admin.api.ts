import { apiClient } from "./client.js";
import type {
  ApiSuccessResponse,
  AdminUserItem,
  RolePermissionsResponse,
  PaginationMeta,
  RoleName,
  PermissionName,
} from "../types/auth.types.js";

export interface AdminUsersResponseData {
  users: AdminUserItem[];
  pagination: PaginationMeta;
}

export const adminApi = {
  getUsers: async (page = 1, limit = 20) => {
    const res = await apiClient.get<ApiSuccessResponse<AdminUsersResponseData>>(
      "/users",
      {
        params: { page, limit },
      },
    );
    return res.data;
  },

  updateUserRole: async (id: string, roleName: RoleName) => {
    const res = await apiClient.patch<ApiSuccessResponse<AdminUserItem>>(
      `/users/${id}/role`,
      { roleName },
    );
    return res.data;
  },

  getRolePermissions: async (roleName: RoleName) => {
    const res = await apiClient.get<
      ApiSuccessResponse<RolePermissionsResponse>
    >(`/roles/${roleName}/permissions`);
    return res.data;
  },

  updateRolePermissions: async (
    roleName: RoleName,
    permissions: PermissionName[],
  ) => {
    const res = await apiClient.put<
      ApiSuccessResponse<RolePermissionsResponse>
    >(`/roles/${roleName}/permissions`, { permissions });
    return res.data;
  },
};
