import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Alert } from "../../components/ui/index.js";
import { authApi, getApiErrorMessage } from "../../api/index.js";
import { ROUTES } from "../../routes/routes.config.js";
import {
  registerSchema,
  type RegisterFormData,
} from "../../schemas/auth.schemas.js";
import { SocialAuthButtons } from "../../components/auth/SocialAuthButtons.js";

export const RegisterPage: React.FC = () => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setGlobalError(null);
    try {
      await authApi.signup({
        email: data.email,
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      });
      setRegisteredEmail(data.email);
      setIsSuccess(true);
    } catch (err: unknown) {
      setGlobalError(getApiErrorMessage(err));
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div>
          <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
            Account Created
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            A verification link was dispatched to your email address.
          </p>
        </div>

        <Alert variant="ok" title="Verification Pending">
          We sent a confirmation email to{" "}
          <strong className="text-[var(--color-ink)]">{registeredEmail}</strong>
          . Please open the link in your inbox to verify your account before
          signing in.
        </Alert>

        <div className="pt-2">
          <Link to={ROUTES.LOGIN} className="w-full block">
            <Button variant="primary" className="w-full">
              Proceed to Sign In
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
          Create Account
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Provision a new identity for the AuthSphere security control plane
        </p>
      </div>

      {globalError && (
        <Alert variant="bad" onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      )}

      {/* Social OAuth full-page redirect buttons */}
      <SocialAuthButtons actionText="Register" />

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-[var(--color-rule)]" />
        <span className="text-[11px] text-[var(--color-muted)]">
          or direct registration
        </span>
        <div className="flex-1 h-px bg-[var(--color-rule)]" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="First Name (optional)"
            type="text"
            autoComplete="given-name"
            placeholder="Jane"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Last Name (optional)"
            type="text"
            autoComplete="family-name"
            placeholder="Doe"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="operator@authsphere.io"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          passwordToggle
          error={errors.password?.message}
          hint="Must be at least 8 characters with uppercase, lowercase, and digit"
          {...register("password")}
        />

        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••••••"
          passwordToggle
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          Create Identity
        </Button>
      </form>

      <div className="text-center text-xs pt-1 border-t border-[var(--color-rule)]">
        <span className="text-[var(--color-muted)]">
          Already have an identity?{" "}
        </span>
        <Link
          to={ROUTES.LOGIN}
          className="text-[var(--color-accent)] hover:underline font-medium"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};
