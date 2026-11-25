import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import QRCode from "qrcode";
import { OAUTH_PROVIDERS } from "@authsphere/shared";
import { useAuthStore } from "../../stores/auth.store.js";
import { authApi, mfaApi, getApiErrorMessage } from "../../api/index.js";
import {
  Button,
  Input,
  Alert,
  Badge,
  Modal,
} from "../../components/ui/index.js";
import { ROUTES, OAUTH_URLS } from "../../routes/routes.config.js";
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "../../schemas/auth.schemas.js";

export const SecurityPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, bootstrapAuth, clearAuthUser } = useAuthStore();

  const errorParam = searchParams.get("error");
  const linkedParam = searchParams.get("linked");

  // Status & Notifications
  const [globalError, setGlobalError] = useState<string | null>(errorParam);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(() => {
    if (linkedParam) {
      const formatted =
        linkedParam.charAt(0).toUpperCase() +
        linkedParam.slice(1).toLowerCase();
      return `${formatted} account connected successfully.`;
    }
    return null;
  });

  // Clear query parameters from OAuth redirects once captured
  useEffect(() => {
    if (searchParams.has("error") || searchParams.has("linked")) {
      navigate(ROUTES.APP.SECURITY, { replace: true });
    }
  }, [searchParams, navigate]);

  // OAuth Unlink State
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(
    null,
  );

  // 2FA Setup State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupOtpUri, setSetupOtpUri] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [isVerifyingSetup, setIsVerifyingSetup] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    if (!setupOtpUri) return;

    let isMounted = true;

    QRCode.toDataURL(setupOtpUri, {
      width: 200,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrCodeDataUrl(url);
          setQrCodeError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          console.error("Failed to render QR Code", err);
          setQrCodeError("Failed to generate QR code");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [setupOtpUri]);

  // Recovery Codes Modal
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // 2FA Regeneration Modal
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regenCode, setRegenCode] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // 2FA Disable Modal
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // Password Modification Form
  const [requiresMfaForPassword, setRequiresMfaForPassword] = useState(false);
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    setError: setPasswordError,
    formState: { errors: passwordErrors, isSubmitting: isChangingPassword },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Disconnect OAuth Provider
  const handleUnlinkOAuth = async (provider: string) => {
    setUnlinkingProvider(provider);
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      await authApi.unlinkOAuth(provider);
      await bootstrapAuth();
      const formatted =
        provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
      setGlobalSuccess(`${formatted} account disconnected successfully.`);
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    } finally {
      setUnlinkingProvider(null);
    }
  };

  // Initiate 2FA Enrollment
  const handleStartSetup = async () => {
    setIsStartingSetup(true);
    setSetupError(null);
    try {
      const res = await mfaApi.setup();
      if (res.data) {
        setSetupSecret(res.data.secret);
        setSetupOtpUri(res.data.otpauthUri);
        setIsSetupModalOpen(true);
      }
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    } finally {
      setIsStartingSetup(false);
    }
  };

  // Verify 2FA Setup
  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    setIsVerifyingSetup(true);
    setSetupError(null);
    try {
      const res = await mfaApi.verifySetup(verifyCode.trim());
      setIsSetupModalOpen(false);
      setVerifyCode("");

      if (res.data?.recoveryCodes) {
        setRecoveryCodes(res.data.recoveryCodes);
        setIsRecoveryModalOpen(true);
      }

      await bootstrapAuth();
      setGlobalSuccess(
        "Two-factor authentication has been successfully activated.",
      );
    } catch (err: unknown) {
      setSetupError(getApiErrorMessage(err));
    } finally {
      setIsVerifyingSetup(false);
    }
  };

  // Regenerate Recovery Codes
  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regenCode.trim()) return;

    setIsRegenerating(true);
    setRegenError(null);
    try {
      const res = await mfaApi.regenerateRecoveryCodes(regenCode.trim());
      setIsRegenerateModalOpen(false);
      setRegenCode("");

      if (res.data?.recoveryCodes) {
        setRecoveryCodes(res.data.recoveryCodes);
        setIsRecoveryModalOpen(true);
      }
      await bootstrapAuth();
      setGlobalSuccess("New emergency recovery codes have been generated.");
    } catch (err: unknown) {
      setRegenError(getApiErrorMessage(err));
    } finally {
      setIsRegenerating(false);
    }
  };

  // Disable 2FA
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode.trim()) return;

    setIsDisabling(true);
    setDisableError(null);
    try {
      await mfaApi.disable(disableCode.trim());
      setIsDisableModalOpen(false);
      clearAuthUser();
      navigate(ROUTES.LOGIN);
    } catch (err: unknown) {
      setDisableError(getApiErrorMessage(err));
    } finally {
      setIsDisabling(false);
    }
  };

  // Submit Password Change
  const onChangePassword = async (data: ChangePasswordFormData) => {
    setGlobalError(null);
    setGlobalSuccess(null);

    if (user?.hasPassword !== false && !data.oldPassword) {
      setPasswordError("oldPassword", {
        message: "Current password is required",
      });
      return;
    }

    try {
      const res = await authApi.changePassword({
        oldPassword: data.oldPassword || undefined,
        newPassword: data.newPassword,
        code: data.code?.trim() || undefined,
      });

      if (res.data?.mfaRequired) {
        setRequiresMfaForPassword(true);
        return;
      }

      resetPasswordForm();
      setRequiresMfaForPassword(false);
      clearAuthUser();
      navigate(ROUTES.LOGIN);
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    }
  };

  const copyToClipboard = (text: string, onCopied: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    onCopied(true);
    setTimeout(() => onCopied(false), 2000);
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const content = `AuthSphere Emergency Recovery Codes\nUser: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\nEach code can only be used once to access your account:\n\n${recoveryCodes.join(
      "\n",
    )}\n\nStore this file securely in an encrypted vault or password manager.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "authsphere-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display font-medium text-xl text-[var(--color-ink)]">
          Security &amp; Credentials
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Manage two-factor authentication, emergency recovery codes, password,
          and social account connections
        </p>
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

      {/* Grid of Security Panels */}
      <div className="grid grid-cols-1 gap-6">
        {/* Two-Factor Authentication Card */}
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--color-rule)] gap-2">
            <div>
              <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
                Two-Factor Authentication (TOTP)
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Secures identity verification with time-based 6-digit one-time
                codes
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {user?.mfaEnabled &&
                user.remainingRecoveryCodes !== undefined && (
                  <Badge
                    variant={
                      user.remainingRecoveryCodes === 0
                        ? "bad"
                        : user.remainingRecoveryCodes <= 2
                          ? "accent"
                          : "neutral"
                    }
                    isMono
                  >
                    {user.remainingRecoveryCodes} / 10 CODES REMAINING
                  </Badge>
                )}
              <Badge variant={user?.mfaEnabled ? "ok" : "bad"} isMono>
                {user?.mfaEnabled ? "ENABLED" : "DISABLED"}
              </Badge>
            </div>
          </div>

          <div className="text-xs text-[var(--color-ink-2)] leading-relaxed space-y-1.5">
            {user?.mfaEnabled ? (
              <>
                <p>
                  Two-factor authentication is currently active on your account.
                  Every sign-in requires your primary credentials plus a
                  temporary one-time password generated by your authenticator
                  app (e.g. Google Authenticator, 1Password, Bitwarden).
                </p>
                <p className="text-[var(--color-muted)]">
                  Recovery backup codes are hashed at rest and cannot be viewed
                  once saved. If you lost your codes, generate a new set below.
                </p>
              </>
            ) : (
              <p>
                Two-factor authentication is not yet enabled. Protecting your
                account with 2FA prevents unauthorized access even if your
                password becomes compromised.
              </p>
            )}
          </div>

          {user?.mfaEnabled &&
            user.remainingRecoveryCodes !== undefined &&
            user.remainingRecoveryCodes <= 2 && (
              <Alert
                variant={user.remainingRecoveryCodes === 0 ? "bad" : "warn"}
                title={
                  user.remainingRecoveryCodes === 0
                    ? "Critical: 0 Emergency Recovery Codes Remaining"
                    : "Low Recovery Codes Warning"
                }
              >
                {user.remainingRecoveryCodes === 0
                  ? "You have exhausted all 10 emergency recovery codes. If you lose access to your authenticator app, you will be permanently locked out of your account. Generate a new set below immediately."
                  : `You have only ${user.remainingRecoveryCodes} recovery code${user.remainingRecoveryCodes === 1 ? "" : "s"} remaining. Regenerate a new set now to avoid losing emergency access.`}
              </Alert>
            )}

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            {user?.mfaEnabled ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsRegenerateModalOpen(true)}
                >
                  Regenerate Recovery Codes
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDisableModalOpen(true)}
                >
                  Disable 2FA
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                isLoading={isStartingSetup}
                onClick={handleStartSetup}
              >
                Enable Two-Factor Authentication
              </Button>
            )}
          </div>
        </div>

        {/* Password Modification / Setup Card */}
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[var(--color-rule)]">
            <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
              {user?.hasPassword === false
                ? "Set Account Password"
                : "Password Modification"}
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              {user?.hasPassword === false
                ? "Set a password to enable password-based login alongside your connected social accounts."
                : "Update credentials. Changing password terminates all active sessions across all devices."}
            </p>
          </div>

          {requiresMfaForPassword && (
            <Alert variant="warn" title="2FA Challenge">
              Please enter your 6-digit authenticator verification code below to
              authorize this password change.
            </Alert>
          )}

          <form
            onSubmit={handlePasswordSubmit(onChangePassword)}
            className="space-y-4 max-w-lg"
            noValidate
          >
            {user?.hasPassword !== false && (
              <Input
                label="Current Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                passwordToggle
                error={passwordErrors.oldPassword?.message}
                {...registerPassword("oldPassword")}
              />
            )}

            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              passwordToggle
              error={passwordErrors.newPassword?.message}
              hint="Must be at least 8 characters with uppercase, lowercase, and digit"
              {...registerPassword("newPassword")}
            />

            <Input
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              passwordToggle
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword("confirmPassword")}
            />

            {(user?.mfaEnabled || requiresMfaForPassword) && (
              <Input
                label="2FA Verification Code"
                type="text"
                autoComplete="one-time-code"
                placeholder="000000 or xxxxx-xxxxx"
                className="font-mono text-center tracking-widest"
                error={passwordErrors.code?.message}
                hint="Required because two-factor authentication is active"
                {...registerPassword("code")}
              />
            )}

            <Button
              type="submit"
              variant="secondary"
              isLoading={isChangingPassword}
            >
              {user?.hasPassword === false
                ? "Set Password"
                : "Update Password & Revoke Other Sessions"}
            </Button>
          </form>
        </div>

        {/* OAuth Social Account Linking Card */}
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-card)] p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[var(--color-rule)]">
            <h2 className="font-display font-medium text-sm text-[var(--color-ink)]">
              Connected Social Providers
            </h2>
            <p className="text-xs text-[var(--color-muted)]">
              Link external identity providers to your account for fast,
              single-click sign in
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-[var(--color-paper-2)] border border-[var(--color-rule)] flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--color-ink)]">
                    Google Identity
                  </div>
                  <div className="text-[10px] text-[var(--color-muted)]">
                    OAuth 2.0 with PKCE
                  </div>
                </div>
              </div>

              {user?.oauthProviders?.includes(OAUTH_PROVIDERS.GOOGLE) ? (
                <div className="flex items-center gap-2">
                  <Badge variant="ok" size="sm" isMono>
                    CONNECTED
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={unlinkingProvider === OAUTH_PROVIDERS.GOOGLE}
                    disabled={unlinkingProvider !== null}
                    onClick={() => handleUnlinkOAuth(OAUTH_PROVIDERS.GOOGLE)}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <a
                  href={`${OAUTH_URLS.GOOGLE}?returnTo=${encodeURIComponent(ROUTES.APP.SECURITY)}`}
                >
                  <Button variant="secondary" size="sm">
                    Connect
                  </Button>
                </a>
              )}
            </div>

            <div className="p-4 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[var(--radius-pill)] bg-[var(--color-paper-2)] border border-[var(--color-rule)] flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--color-ink)]">
                    GitHub Identity
                  </div>
                  <div className="text-[10px] text-[var(--color-muted)]">
                    OAuth 2.0 with PKCE
                  </div>
                </div>
              </div>

              {user?.oauthProviders?.includes(OAUTH_PROVIDERS.GITHUB) ? (
                <div className="flex items-center gap-2">
                  <Badge variant="ok" size="sm" isMono>
                    CONNECTED
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={unlinkingProvider === OAUTH_PROVIDERS.GITHUB}
                    disabled={unlinkingProvider !== null}
                    onClick={() => handleUnlinkOAuth(OAUTH_PROVIDERS.GITHUB)}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <a
                  href={`${OAUTH_URLS.GITHUB}?returnTo=${encodeURIComponent(ROUTES.APP.SECURITY)}`}
                >
                  <Button variant="secondary" size="sm">
                    Connect
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Enrollment Modal */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
          setSetupError(null);
          setVerifyCode("");
          setQrCodeDataUrl(null);
        }}
        title="Enroll Two-Factor Authentication"
        description="Scan the QR code with your authenticator app or enter the key manually"
      >
        <div className="space-y-4">
          {setupError && <Alert variant="bad">{setupError}</Alert>}

          {/* Visual QR Code Scanner Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-card)] text-center space-y-2">
            <span className="text-xs font-medium text-[var(--color-ink)]">
              1. Scan with Authenticator App
            </span>
            <div className="p-2.5 bg-white rounded-lg border border-[var(--color-rule)] shadow-xs inline-block my-1">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="MFA QR Code"
                  className="w-44 h-44 block mx-auto"
                />
              ) : qrCodeError ? (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-[var(--color-bad)]">
                  {qrCodeError}
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-[var(--color-muted)]">
                  Generating QR code…
                </div>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-muted)] max-w-xs">
              Scan with Google Authenticator, Authy, 1Password, Microsoft
              Authenticator, or Bitwarden.
            </p>
          </div>

          <div className="p-3 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-card)] space-y-2">
            <span className="text-xs text-[var(--color-muted)] font-medium block">
              Or enter key manually
            </span>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono font-semibold text-[var(--color-accent)] tracking-wider break-all select-all">
                {setupSecret}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-7 px-2.5"
                onClick={() =>
                  setupSecret && copyToClipboard(setupSecret, setCopiedSecret)
                }
              >
                {copiedSecret ? "Copied" : "Copy Key"}
              </Button>
            </div>
            {setupOtpUri && (
              <div className="pt-0.5">
                <a
                  href={setupOtpUri}
                  className="text-xs text-[var(--color-cool)] hover:underline block"
                >
                  Open in desktop authenticator
                </a>
              </div>
            )}
          </div>

          <form onSubmit={handleConfirmSetup} className="space-y-4 pt-1">
            <Input
              label="2. Confirm with 6-digit Code"
              type="text"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="font-mono text-center tracking-widest text-lg"
              hint="Enter the 6-digit code from your authenticator app. Emergency recovery codes will be revealed immediately upon activation."
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsSetupModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isVerifyingSetup}
                disabled={!verifyCode.trim()}
              >
                Verify &amp; Activate 2FA
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Emergency Recovery Codes Reveal Modal */}
      <Modal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        title="Emergency Recovery Codes"
        description="Store these backup codes in a safe place. If you lose your TOTP device, each code can be used once to access your account."
      >
        <div className="space-y-4">
          <Alert variant="warn">
            These recovery codes will NOT be displayed again. If you lose your
            device and do not have these codes, you may permanently lose access.
          </Alert>

          <div className="p-4 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-pill)] grid grid-cols-2 gap-2 text-center">
            {recoveryCodes?.map((code, idx) => (
              <div
                key={idx}
                className="font-mono text-xs text-[var(--color-ink)] font-semibold p-1.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded"
              >
                {code}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                recoveryCodes &&
                copyToClipboard(recoveryCodes.join("\n"), setCopiedCodes)
              }
            >
              {copiedCodes ? "Copied All" : "Copy All Codes"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={downloadRecoveryCodes}
            >
              Download (.txt)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRecoveryModalOpen(false)}
            >
              I Have Saved Them
            </Button>
          </div>
        </div>
      </Modal>

      {/* Regenerate Recovery Codes Modal */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => {
          setIsRegenerateModalOpen(false);
          setRegenError(null);
          setRegenCode("");
        }}
        title="Regenerate Recovery Codes"
        description="Regenerating codes invalidates all previous recovery codes."
      >
        <form onSubmit={handleRegenerateCodes} className="space-y-4">
          {regenError && <Alert variant="bad">{regenError}</Alert>}

          <Input
            label="2FA Verification Code"
            type="text"
            autoComplete="one-time-code"
            placeholder="000000"
            autoFocus
            value={regenCode}
            onChange={(e) => setRegenCode(e.target.value)}
            className="font-mono text-center tracking-widest text-base"
            hint="Enter your current 6-digit TOTP code to confirm identity"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsRegenerateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isRegenerating}
              disabled={!regenCode.trim()}
            >
              Regenerate Codes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal
        isOpen={isDisableModalOpen}
        onClose={() => {
          setIsDisableModalOpen(false);
          setDisableError(null);
          setDisableCode("");
        }}
        title="Disable Two-Factor Authentication"
        description="Disabling 2FA lowers account security and will revoke all current sessions across all devices."
      >
        <form onSubmit={handleDisableMfa} className="space-y-4">
          {disableError && <Alert variant="bad">{disableError}</Alert>}

          <Alert variant="bad">
            Warning: Disabling 2FA will immediately invalidate all active
            sessions. You will be logged out and required to sign back in with
            your password.
          </Alert>

          <Input
            label="2FA Verification Code"
            type="text"
            autoComplete="one-time-code"
            placeholder="000000"
            autoFocus
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            className="font-mono text-center tracking-widest text-base"
            hint="Enter your 6-digit TOTP code or emergency backup code"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsDisableModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              isLoading={isDisabling}
              disabled={!disableCode.trim()}
            >
              Confirm &amp; Disable 2FA
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
