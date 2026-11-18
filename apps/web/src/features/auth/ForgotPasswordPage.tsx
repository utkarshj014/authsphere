import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Alert } from "../../components/ui/index.js";
import { authApi, getApiErrorMessage } from "../../api/index.js";
import { ROUTES } from "../../routes/routes.config.js";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "../../schemas/auth.schemas.js";

export const ForgotPasswordPage: React.FC = () => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setGlobalError(null);
    try {
      await authApi.forgotPassword(data.email);
      setIsSent(true);
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
          Reset Password
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Receive a secure recovery link to regain access to your account
        </p>
      </div>

      {globalError && (
        <Alert variant="bad" onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}

      {isSent ? (
        <div className="space-y-4">
          <Alert variant="ok" title="Recovery Link Dispatched">
            If an account exists with that email address, a password reset link
            has been sent. Please check your inbox and follow the instructions.
          </Alert>
          <div className="pt-2">
            <Link to={ROUTES.LOGIN} className="w-full block">
              <Button variant="secondary" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="operator@authsphere.io"
            hint="Enter the email associated with your AuthSphere identity"
            error={errors.email?.message}
            {...register("email")}
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="w-full"
          >
            Send Recovery Link
          </Button>
        </form>
      )}

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
