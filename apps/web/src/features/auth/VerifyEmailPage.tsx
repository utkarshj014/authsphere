import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Alert, Skeleton, Input } from "../../components/ui/index.js";
import { authApi, getApiErrorMessage } from "../../api/index.js";
import { ROUTES } from "../../routes/routes.config.js";

type VerificationStatus = "verifying" | "success" | "error" | "missing_token";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email") || "";

  const [status, setStatus] = useState<VerificationStatus>(
    token ? "verifying" : "missing_token",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend verification state
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const executedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (executedTokenRef.current === token) return;
    executedTokenRef.current = token;

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus("success");
      })
      .catch((err: unknown) => {
        setErrorMessage(getApiErrorMessage(err));
        setStatus("error");
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendError(null);
    try {
      await authApi.resendVerification(resendEmail.trim());
      setResendSuccess(true);
    } catch (err: unknown) {
      setResendError(getApiErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  const getHeaderInfo = () => {
    switch (status) {
      case "verifying":
        return {
          title: "Verifying Email",
          subtitle:
            "Validating your verification token against the security registry…",
        };
      case "success":
        return {
          title: "Email Confirmed",
          subtitle:
            "Your identity credentials have been successfully activated",
        };
      case "error":
        return {
          title: "Verification Failed",
          subtitle:
            "The verification link is invalid, expired, or has already been used",
        };
      case "missing_token":
      default:
        return {
          title: "Email Verification",
          subtitle: "Request a fresh verification link to confirm your account",
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div>
        <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
          {title}
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">{subtitle}</p>
      </div>

      {status === "verifying" && (
        <div className="space-y-3 py-6">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <p className="text-xs text-[var(--color-muted)] pt-2">
            Confirming security credentials with AuthSphere…
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <Alert variant="ok" title="Identity Activated">
            Your email address has been verified. You can now access all
            protected features of the AuthSphere control plane.
          </Alert>

          <div className="pt-2">
            <Link to={ROUTES.LOGIN} className="w-full block">
              <Button variant="primary" className="w-full">
                Proceed to Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}

      {(status === "missing_token" || status === "error") && (
        <div className="space-y-4">
          {status === "error" ? (
            <Alert variant="bad" title="Invalid or Expired Link">
              {errorMessage ||
                "This verification token is invalid or has expired. Request a new link below to proceed."}
            </Alert>
          ) : (
            <Alert variant="info" title="Verification Link Required">
              No verification token was found in the URL. If you need a fresh
              confirmation link, enter your email address below.
            </Alert>
          )}

          {resendSuccess ? (
            <div className="space-y-4 pt-1">
              <Alert variant="ok" title="Verification Link Dispatched">
                If an account with <strong>{resendEmail}</strong> exists and
                requires verification, a fresh confirmation link has been sent
                to your inbox. If your account is already verified, you can
                proceed directly to sign in.
              </Alert>
              <Link to={ROUTES.LOGIN} className="w-full block">
                <Button variant="primary" className="w-full">
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-4 pt-1">
              {resendError && <Alert variant="bad">{resendError}</Alert>}

              <Input
                label="Email Address"
                type="email"
                required
                autoFocus={!emailParam}
                placeholder="name@example.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                hint="We'll send a single-use verification link to this address"
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isResending}
                disabled={!resendEmail.trim()}
                className="w-full"
              >
                Send Verification Link
              </Button>

              <div className="pt-1 text-center">
                <Link
                  to={ROUTES.LOGIN}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors inline-block"
                >
                  Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
