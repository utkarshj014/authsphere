import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Alert } from "../../components/ui/index.js";
import { authApi, getApiErrorMessage } from "../../api/index.js";
import { ROUTES } from "../../routes/routes.config.js";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "../../schemas/auth.schemas.js";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mfaPromptRequired, setMfaPromptRequired] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setGlobalError(
        "Missing recovery token. Please request a new password reset link.",
      );
      return;
    }

    setGlobalError(null);
    try {
      const res = await authApi.resetPassword({
        token,
        password: data.password,
        code: data.code?.trim() || undefined,
      });

      if (res.data?.mfaRequired) {
        setMfaPromptRequired(true);
        return;
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
            Invalid Recovery Link
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            This password reset link is invalid or expired.
          </p>
        </div>
        <Alert variant="bad">
          No recovery token was found in the link. Please request a new password
          reset link.
        </Alert>
        <div className="pt-2">
          <Link to={ROUTES.FORGOT_PASSWORD} className="w-full block">
            <Button variant="primary" className="w-full">
              Request New Reset Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div>
          <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
            Password Reset Complete
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Your credentials have been securely updated
          </p>
        </div>
        <Alert variant="ok" title="Success">
          Your password has been changed. All previous sessions have been
          invalidated. Please sign in with your new credentials.
        </Alert>
        <div className="pt-2">
          <Link to={ROUTES.LOGIN} className="w-full block">
            <Button variant="primary" className="w-full">
              Sign In Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
          Set New Password
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Establish new security credentials for your account
        </p>
      </div>

      {globalError && (
        <Alert variant="bad" onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}

      {mfaPromptRequired && (
        <Alert variant="warn" title="Two-Factor Authentication Required">
          This account is protected by 2FA. Please enter the 6-digit code from
          your authenticator app or an emergency recovery code below to proceed.
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          passwordToggle
          error={errors.password?.message}
          hint="Must be at least 8 characters with uppercase, lowercase, and digit"
          {...register("password")}
        />

        <Input
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          passwordToggle
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {mfaPromptRequired && (
          <Input
            label="2FA Verification Code"
            type="text"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000 or xxxxx-xxxxx"
            error={errors.code?.message}
            hint="Enter your 6-digit TOTP code or an 11-character backup code"
            className="font-mono text-center tracking-widest text-base"
            {...register("code")}
          />
        )}

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          {mfaPromptRequired ? "Verify & Reset Password" : "Reset Password"}
        </Button>
      </form>

      <div className="text-center text-xs pt-1 border-t border-[var(--color-rule)]">
        <Link
          to={ROUTES.LOGIN}
          className="text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          Remember your password? Sign in
        </Link>
      </div>
    </div>
  );
};
