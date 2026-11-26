import { apiClient } from "./client.js";
import type {
  ApiSuccessResponse,
  MfaSetupResponse,
  MfaVerifySetupResponse,
  MfaLoginResponse,
  MfaRecoveryCodesResponse,
} from "../types/auth.types.js";

export const mfaApi = {
  setup: async () => {
    const res =
      await apiClient.post<ApiSuccessResponse<MfaSetupResponse>>(
        "/auth/mfa/setup",
      );
    return res.data;
  },

  verifySetup: async (code: string) => {
    const res = await apiClient.post<
      ApiSuccessResponse<MfaVerifySetupResponse>
    >("/auth/mfa/verify-setup", { code });
    return res.data;
  },

  verifyLogin: async (mfaToken: string | null | undefined, code: string) => {
    const res = await apiClient.post<ApiSuccessResponse<MfaLoginResponse>>(
      "/auth/mfa/verify",
      { code, ...(mfaToken ? { mfaToken } : {}) },
    );
    return res.data;
  },

  disable: async (code: string) => {
    const res = await apiClient.post<ApiSuccessResponse<null>>(
      "/auth/mfa/disable",
      { code },
    );
    return res.data;
  },

  regenerateRecoveryCodes: async (code: string) => {
    const res = await apiClient.post<
      ApiSuccessResponse<MfaRecoveryCodesResponse>
    >("/auth/mfa/regenerate-recovery-codes", { code });
    return res.data;
  },
};
