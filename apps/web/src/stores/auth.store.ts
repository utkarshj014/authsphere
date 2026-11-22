import { create } from "zustand";
import type {
  UserProfile,
  AuthStatus,
  ApiSuccessResponse,
} from "../types/auth.types.js";
import {
  apiClient,
  registerAuthFailureHandler,
  registerForbiddenHandler,
} from "../api/client.js";

interface AuthState {
  user: UserProfile | null;
  status: AuthStatus;
  mfaToken: string | null;
  isMfaRequired: boolean;

  setAuthUser: (user: UserProfile) => void;
  clearAuthUser: () => void;
  setMfaChallenge: (mfaToken: string) => void;
  clearMfaChallenge: () => void;
  setStatus: (status: AuthStatus) => void;
  bootstrapAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

let bootstrapSequence = 0;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  mfaToken: null,
  isMfaRequired: false,

  setAuthUser: (user: UserProfile) =>
    set({
      user,
      status: "authenticated",
      mfaToken: null,
      isMfaRequired: false,
    }),

  clearAuthUser: () =>
    set({
      user: null,
      status: "unauthenticated",
      mfaToken: null,
      isMfaRequired: false,
    }),

  setMfaChallenge: (mfaToken: string) =>
    set({
      mfaToken,
      isMfaRequired: true,
    }),

  clearMfaChallenge: () =>
    set({
      mfaToken: null,
      isMfaRequired: false,
    }),

  setStatus: (status: AuthStatus) => set({ status }),

  bootstrapAuth: async () => {
    const seq = ++bootstrapSequence;
    set({ status: "loading" });
    try {
      const response =
        await apiClient.get<ApiSuccessResponse<UserProfile>>("/auth/me");

      // Discard stale responses if a newer bootstrap was initiated
      if (seq !== bootstrapSequence) return;

      if (response.data?.data) {
        set({
          user: response.data.data,
          status: "authenticated",
        });
      } else {
        set({
          user: null,
          status: "unauthenticated",
        });
      }
    } catch (err: unknown) {
      if (seq !== bootstrapSequence) return;

      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        set({
          user: null,
          status: "unauthenticated",
        });
      } else {
        // Network offline, 500 server error, DNS failure
        set({
          user: null,
          status: "unavailable",
        });
      }
    }
  },

  refreshUser: async () => {
    try {
      const response =
        await apiClient.get<ApiSuccessResponse<UserProfile>>("/auth/me");
      if (response.data?.data) {
        set({ user: response.data.data });
      }
    } catch {
      // Ignore background refresh errors
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      set({
        user: null,
        status: "unauthenticated",
        mfaToken: null,
        isMfaRequired: false,
      });
    }
  },

  logoutAll: async () => {
    try {
      await apiClient.post("/auth/logout-all");
    } finally {
      set({
        user: null,
        status: "unauthenticated",
        mfaToken: null,
        isMfaRequired: false,
      });
    }
  },
}));

// Invert control: register store invalidation and outage handlers without circular imports
registerAuthFailureHandler((reason) => {
  if (reason === "unauthenticated") {
    useAuthStore.getState().clearAuthUser();
  } else if (reason === "unavailable") {
    useAuthStore.getState().setStatus("unavailable");
  }
});

registerForbiddenHandler(async () => {
  await useAuthStore.getState().refreshUser();
});
