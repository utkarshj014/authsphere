import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Alert, Skeleton } from "../../components/ui/index.js";
import { authApi, getApiErrorMessage } from "../../api/index.js";
import { ROUTES } from "../../routes/routes.config.js";

type VerificationStatus = "verifying" | "success" | "error" | "missing_token";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationStatus>(
    token ? "verifying" : "missing_token",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const performVerification = async () => {
      try {
        await authApi.verifyEmail(token);
        if (isMounted) {
          setStatus("success");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(err));
          setStatus("error");
        }
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="space-y-5 text-center">
      <div className="w-12 h-12 rounded-[var(--radius-pill)] bg-[var(--color-cool-soft)] text-[var(--color-cool)] border border-[var(--color-cool)]/30 flex items-center justify-center mx-auto">
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>

      <div>
        <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
          Email Verification
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Confirming identity credentials with AuthSphere
        </p>
      </div>

      {status === "missing_token" && (
        <div className="space-y-4">
          <Alert variant="bad">
            No verification token was found in the link. Please check your email
            or request a new verification link.
          </Alert>
          <div className="pt-2">
            <Link to={ROUTES.LOGIN} className="w-full block">
              <Button variant="secondary" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}

      {status === "verifying" && (
        <div className="space-y-3 py-4">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <p className="text-xs text-[var(--color-muted)]">
            Validating verification token against security registry…
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Alert variant="ok" title="Email Confirmed">
            Your email address has been successfully verified! Your identity is
            now fully activated.
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

      {status === "error" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Alert variant="bad" title="Verification Failed">
            {errorMessage ||
              "The verification token is invalid, expired, or has already been used."}
          </Alert>
          <div className="pt-2">
            <Link to={ROUTES.LOGIN} className="w-full block">
              <Button variant="secondary" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
