import { apiClient } from "./client.js";
import type { ApiSuccessResponse, SessionItem } from "../types/auth.types.js";

export const sessionsApi = {
  getSessions: async (signal?: AbortSignal) => {
    const res = await apiClient.get<ApiSuccessResponse<SessionItem[]>>(
      "/sessions",
      signal ? { signal } : undefined,
    );
    return res.data;
  },

  revokeSession: async (id: string) => {
    const res = await apiClient.delete<ApiSuccessResponse<null>>(
      `/sessions/${id}`,
    );
    return res.data;
  },
};
