import { apiClient } from "./client.js";
import type {
  ApiSuccessResponse,
  SecurityEventItem,
  PaginationMeta,
} from "../types/auth.types.js";

export interface SecurityEventsResponseData {
  events: SecurityEventItem[];
  pagination: PaginationMeta;
}

export const activityApi = {
  getSecurityEvents: async (page = 1, limit = 20, signal?: AbortSignal) => {
    const res = await apiClient.get<
      ApiSuccessResponse<SecurityEventsResponseData>
    >("/auth/security-events", {
      params: { page, limit },
      ...(signal ? { signal } : {}),
    });
    return res.data;
  },
};
