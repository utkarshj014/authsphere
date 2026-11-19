import { apiClient } from "./client.js";
import type {
  ApiSuccessResponse,
  UserProfile,
  MfaChallengePayload,
} from "../types/auth.types.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
  code?: string;
}

export interface ChangePasswordInput {
  oldPassword?: string;
  newPassword: string;
  code?: string;
}

export const authApi = {
  login: async (data: LoginInput) => {
    const res = await apiClient.post<
      ApiSuccessResponse<MfaChallengePayload | null>
    >("/auth/login", data);
    return res.data;
  },

  signup: async (data: SignupInput) => {
    const res = await apiClient.post<ApiSuccessResponse<null>>(
      "/auth/signup",
      data,
    );
    return res.data;
  },

  verifyEmail: async (token: string) => {
    const res = await apiClient.post<ApiSuccessResponse<null>>(
      "/auth/verify-email",
      { token },
    );
    return res.data;
  },

  resendVerification: async (email: string) => {
    const res = await apiClient.post<ApiSuccessResponse<null>>(
      "/auth/resend-verification",
      { email },
    );
    return res.data;
  },

  sendMagicLink: async (email: string) => {
    const res = await apiClient.post<ApiSuccessResponse<null>>(
      "/auth/magic-link",
      { email },
    );
    return res.data;
  },

  verifyMagicLink: async (token: string) => {
    const res = await apiClient.post<
      ApiSuccessResponse<MfaChallengePayload | null>
    >("/auth/magic-link/verify", { token });
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await apiClient.post<ApiSuccessResponse<null>>(
      "/auth/forgot-password",
      { email },
    );
    return res.data;
  },

  resetPassword: async (data: ResetPasswordInput) => {
    const res = await apiClient.post<
      ApiSuccessResponse<{ mfaRequired: true } | null>
    >("/auth/reset-password", data);
    return res.data;
  },

  changePassword: async (data: ChangePasswordInput) => {
    const res = await apiClient.post<
      ApiSuccessResponse<{ mfaRequired: true } | null>
    >("/auth/change-password", data);
    return res.data;
  },

  getMe: async () => {
    const res =
      await apiClient.get<ApiSuccessResponse<UserProfile>>("/auth/me");
    return res.data;
  },

  logout: async () => {
    const res = await apiClient.post<ApiSuccessResponse<null>>("/auth/logout");
    return res.data;
  },

  logoutAll: async () => {
    const res =
      await apiClient.post<ApiSuccessResponse<null>>("/auth/logout-all");
    return res.data;
  },
};
