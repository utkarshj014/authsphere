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
  sessionExpired: boolean;

  clearAuthUser: () => void;
  clearSessionExpired: () => void;
  bootstrapAuth: () => Promise<void>;
  syncSession: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

// Monotonic epoch incremented on explicit sign-out / revocation so an in-flight /auth/me cannot resurrect a cleared session
let sessionEpoch = 0;
let inflightSessionPromise: Promise<boolean> | null = null;
let inflightBootstrap: Promise<void> | null = null;

type StoreSet = (partial: Partial<AuthState>) => void;

const resolveSession = (
  set: StoreSet,
  options: { markUnavailableOnError: boolean },
): Promise<boolean> => {
  if (inflightSessionPromise) {
    return inflightSessionPromise;
  }

  const requestEpoch = sessionEpoch;
  inflightSessionPromise = apiClient
    .get<ApiSuccessResponse<UserProfile>>("/auth/me")
    .then((response) => {
      if (requestEpoch !== sessionEpoch) return false;

      if (response.data?.data) {
        set({
          user: response.data.data,
          status: "authenticated",
          sessionExpired: false,
        });
        return true;
      }

      set({ user: null, status: "unauthenticated" });
      return false;
    })
    .catch((err: unknown) => {
      if (requestEpoch !== sessionEpoch) return false;

      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 401) {
        set({ user: null, status: "unauthenticated" });
      } else if (options.markUnavailableOnError) {
        set({ user: null, status: "unavailable" });
      }
      return false;
    })
    .finally(() => {
      inflightSessionPromise = null;
    });

  return inflightSessionPromise;
};

const clearSessionState = (set: StoreSet, sessionExpired = false): void => {
  sessionEpoch += 1;
  set({
    user: null,
    status: "unauthenticated",
    sessionExpired,
  });
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  sessionExpired: false,

  clearAuthUser: () => clearSessionState(set, false),
  clearSessionExpired: () => set({ sessionExpired: false }),

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

  // Non-disruptive session sync: preserves mounted views while validating/hydrating session
  syncSession: () => resolveSession(set, { markUnavailableOnError: false }),

  refreshUser: async () => {
    await resolveSession(set, { markUnavailableOnError: false });
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearSessionState(set, false);
    }
  },

  logoutAll: async () => {
    try {
      await apiClient.post("/auth/logout-all");
    } finally {
      clearSessionState(set, false);
    }
  },
}));

registerAuthFailureHandler((reason) => {
  const store = useAuthStore.getState();
  if (reason === "session_expired") {
    const wasAuthenticated = store.status === "authenticated";
    useAuthStore.setState(() => {
      sessionEpoch += 1;
      return {
        user: null,
        status: "unauthenticated",
        // Only surface session-expired notice if an active authenticated session actually expired
        sessionExpired: wasAuthenticated,
      };
    });
  } else if (reason === "unauthenticated") {
    store.clearAuthUser();
  } else if (reason === "unavailable" && store.status !== "authenticated") {
    // Only render full-screen outage if app is not already interactively mounted
    useAuthStore.setState({ status: "unavailable" });
  }
});

registerForbiddenHandler(async () => {
  await useAuthStore.getState().refreshUser();
});
