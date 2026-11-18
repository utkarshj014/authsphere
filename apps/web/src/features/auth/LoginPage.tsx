import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Alert } from "../../components/ui/index.js";
import { authApi, mfaApi, getApiErrorMessage } from "../../api/index.js";
import { useAuthStore } from "../../stores/index.js";
import { ROUTES } from "../../routes/routes.config.js";
import {
  loginSchema,
  magicLinkSchema,
  type LoginFormData,
  type MagicLinkFormData,
} from "../../schemas/auth.schemas.js";
import { SocialAuthButtons } from "../../components/auth/SocialAuthButtons.js";

const isUnverifiedErrorMessage = (msg: string | null | undefined): boolean => {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return lower.includes("verif") || lower.includes("unverified");
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || ROUTES.APP.ROOT;
  const sessionExpired = searchParams.get("session_expired") === "true";
  const urlError = searchParams.get("error");

  const [activeTab, setActiveTab] = useState<"password" | "magic-link">(
    "password",
  );
  const isUrlUnverified = isUnverifiedErrorMessage(urlError);
  const [globalError, setGlobalError] = useState<string | null>(
    isUrlUnverified ? null : urlError,
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(() =>
    isUrlUnverified ? searchParams.get("email") || "" : null,
  );
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [resendError, setResendError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // MFA Challenge State
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    control: controlPassword,
    formState: { errors: passwordErrors, isSubmitting: isLoggingIn },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Magic Link form
  const {
    register: registerMagic,
    handleSubmit: handleMagicSubmit,
    control: controlMagic,
    formState: { errors: magicErrors, isSubmitting: isSendingMagic },
  } = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  const watchedPasswordEmail = useWatch({
    control: controlPassword,
    name: "email",
  });
  const watchedMagicEmail = useWatch({ control: controlMagic, name: "email" });

  const effectiveEmail =
    unverifiedEmail ||
    (activeTab === "password" ? watchedPasswordEmail : watchedMagicEmail) ||
    searchParams.get("email") ||
    "";

  const isUnverifiedState =
    Boolean(unverifiedEmail) || isUnverifiedErrorMessage(globalError);

  const onPasswordSubmit = async (data: LoginFormData) => {
    setGlobalError(null);
    setUnverifiedEmail(null);
    setResendStatus("idle");
    setResendError(null);

    try {
      const res = await authApi.login(data);

      if (res.data?.mfaRequired && res.data.mfaToken) {
        setMfaToken(res.data.mfaToken);
        return;
      }

      await bootstrapAuth();
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      const errorMsg = getApiErrorMessage(err);

      if (isUnverifiedErrorMessage(errorMsg)) {
        setUnverifiedEmail(data.email);
        setGlobalError(null);
      } else {
        setGlobalError(errorMsg);
      }
    }
  };

  const onMagicSubmit = async (data: MagicLinkFormData) => {
    setGlobalError(null);
    setUnverifiedEmail(null);
    setResendStatus("idle");
    setResendError(null);

    try {
      await authApi.sendMagicLink(data.email);
      setMagicLinkSent(true);
    } catch (err: unknown) {
      const errorMsg = getApiErrorMessage(err);

      if (isUnverifiedErrorMessage(errorMsg)) {
        setUnverifiedEmail(data.email);
        setGlobalError(null);
      } else {
        setGlobalError(errorMsg);
      }
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || !mfaCode.trim()) return;

    setIsVerifyingMfa(true);
    setMfaError(null);

    try {
      await mfaApi.verifyLogin(mfaToken, mfaCode.trim());
      await bootstrapAuth();
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      setMfaError(getApiErrorMessage(err));
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleResendVerification = async () => {
    if (!effectiveEmail.trim()) return;
    setResendStatus("sending");
    setResendError(null);
    try {
      await authApi.resendVerification(effectiveEmail.trim());
      setResendStatus("sent");
    } catch (err: unknown) {
      setResendError(getApiErrorMessage(err));
      setResendStatus("idle");
    }
  };

  // Intermediate MFA Challenge Screen
  if (mfaToken) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div>
          <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
            Two-Factor Authentication
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Enter the 6-digit code from your authenticator app or an emergency
            recovery code.
          </p>
        </div>

        {mfaError && (
          <Alert variant="bad" onClose={() => setMfaError(null)}>
            {mfaError}
          </Alert>
        )}

        <form onSubmit={handleMfaSubmit} className="space-y-4">
          <Input
            label="Verification Code"
            type="text"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000 or xxxxx-xxxxx"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="font-mono text-center tracking-widest text-base"
            hint="Supports 6-digit TOTP codes or 11-character backup codes"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isVerifyingMfa}
            disabled={!mfaCode.trim()}
            className="w-full"
          >
            Verify &amp; Continue
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMfaToken(null);
              setMfaCode("");
              setMfaError(null);
            }}
            className="w-full text-xs"
          >
            Cancel &amp; return to sign in
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
          Sign In
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Authenticate to access the AuthSphere control plane
        </p>
      </div>

      {sessionExpired && (
        <Alert variant="warn">
          Your active session expired. Please authenticate again to continue.
        </Alert>
      )}

      {globalError && !isUnverifiedState && (
        <Alert variant="bad" onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}

      {isUnverifiedState && (
        <Alert variant="warn" title="Email Verification Required">
          <p className="text-xs text-[var(--color-ink-2)] mb-2">
            {effectiveEmail ? (
              <>
                Your email address (<strong>{effectiveEmail}</strong>) has not
                been verified yet. Please verify your email before signing in.
              </>
            ) : (
              <>
                Your email address has not been verified yet. Check your inbox
                or request a new verification link below.
              </>
            )}
          </p>
          {resendStatus === "sent" ? (
            <p className="text-xs text-[var(--color-ok)] font-medium">
              A new verification link has been sent to{" "}
              {effectiveEmail || "your email"}. Please check your inbox or spam
              folder.
            </p>
          ) : (
            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                isLoading={resendStatus === "sending"}
                disabled={!effectiveEmail.trim()}
                onClick={handleResendVerification}
              >
                Resend Verification Link
              </Button>
            </div>
          )}
          {resendError && (
            <p className="text-xs text-[var(--color-bad)] mt-2">
              {resendError}
            </p>
          )}
        </Alert>
      )}

      {/* Social OAuth full-page redirect buttons */}
      <SocialAuthButtons actionText="Continue" />

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-[var(--color-rule)]" />
        <span className="text-[11px] text-[var(--color-muted)]">
          or direct sign in
        </span>
        <div className="flex-1 h-px bg-[var(--color-rule)]" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-rule)]">
        <button
          type="button"
          onClick={() => {
            setActiveTab("password");
            setGlobalError(null);
          }}
          className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "password"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("magic-link");
            setGlobalError(null);
          }}
          className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "magic-link"
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* Mode: Password */}
      {activeTab === "password" && (
        <form
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="operator@authsphere.io"
            error={passwordErrors.email?.message}
            {...registerPassword("email")}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            passwordToggle
            error={passwordErrors.password?.message}
            {...registerPassword("password")}
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoggingIn}
            className="w-full"
          >
            Sign In with Password
          </Button>
        </form>
      )}

      {/* Mode: Magic Link */}
      {activeTab === "magic-link" && (
        <div className="space-y-4">
          {magicLinkSent ? (
            <Alert variant="ok" title="Magic Link Dispatched">
              If an account is associated with this email, a sign-in link has
              been sent. Check your inbox and follow the link to access the
              console.
            </Alert>
          ) : (
            <form
              onSubmit={handleMagicSubmit(onMagicSubmit)}
              className="space-y-4"
              noValidate
            >
              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="operator@authsphere.io"
                hint="We'll send you an instant login link that expires in 15 minutes."
                error={magicErrors.email?.message}
                {...registerMagic("email")}
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isSendingMagic}
                className="w-full"
              >
                Send Magic Link
              </Button>
            </form>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-rule)]">
        <Link
          to={ROUTES.FORGOT_PASSWORD}
          className="text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          Forgot password?
        </Link>
        <Link
          to={ROUTES.REGISTER}
          className="text-[var(--color-accent)] hover:underline font-medium"
        >
          Create account
        </Link>
      </div>
    </div>
  );
};
