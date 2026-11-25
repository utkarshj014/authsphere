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
  syncSession: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

let bootstrapSequence = 0;
let inflightBootstrap: Promise<void> | null = null;

type StoreSet = (partial: Partial<AuthState>) => void;

const resolveSession = async (
  set: StoreSet,
  options: { markUnavailableOnError: boolean },
): Promise<boolean> => {
  const seq = ++bootstrapSequence;
  try {
    const response =
      await apiClient.get<ApiSuccessResponse<UserProfile>>("/auth/me");
    if (seq !== bootstrapSequence) return false;

    if (response.data?.data) {
      set({ user: response.data.data, status: "authenticated" });
      return true;
    }

    set({ user: null, status: "unauthenticated" });
    return false;
  } catch (err: unknown) {
    if (seq !== bootstrapSequence) return false;

    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 401) {
      set({ user: null, status: "unauthenticated" });
    } else if (options.markUnavailableOnError) {
      set({ user: null, status: "unavailable" });
    }
    return false;
  }
};

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
    if (inflightBootstrap) {
      return inflightBootstrap;
    }

    set({ status: "loading" });
    inflightBootstrap = resolveSession(set, {
      markUnavailableOnError: true,
    })
      .then(() => undefined)
      .finally(() => {
        inflightBootstrap = null;
      });

    return inflightBootstrap;
  },

  // Non-disruptive session sync: updates user & auth status without flipping status to "loading"
  // so active routes under GuestGuard/AuthGuard are not unmounted mid-action.
  syncSession: () => resolveSession(set, { markUnavailableOnError: false }),

  refreshUser: async () => {
    await resolveSession(set, { markUnavailableOnError: false });
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
