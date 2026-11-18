import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Alert, Skeleton } from "../../components/ui/index.js";
import { authApi, mfaApi, getApiErrorMessage } from "../../api/index.js";
import { useAuthStore } from "../../stores/index.js";
import { ROUTES } from "../../routes/routes.config.js";

export const MagicLinkVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "Missing magic link verification token in the URL.",
  );

  // MFA Challenge State
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

  const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const verifyToken = async () => {
      try {
        const res = await authApi.verifyMagicLink(token);

        if (!isMounted) return;

        if (res.data?.mfaRequired && res.data.mfaToken) {
          setMfaToken(res.data.mfaToken);
          setIsLoading(false);
          return;
        }

        await bootstrapAuth();
        navigate(ROUTES.APP.ROOT, { replace: true });
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(err));
          setIsLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, bootstrapAuth, navigate]);

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || !mfaCode.trim()) return;

    setIsVerifyingMfa(true);
    setMfaError(null);

    try {
      await mfaApi.verifyLogin(mfaToken, mfaCode.trim());
      await bootstrapAuth();
      navigate(ROUTES.APP.ROOT, { replace: true });
    } catch (err: unknown) {
      setMfaError(getApiErrorMessage(err));
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  // If MFA challenge is required
  if (mfaToken) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        <div>
          <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
            Two-Factor Authentication
          </h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Your magic link was verified. Now enter your 6-digit TOTP code or
            emergency backup code to finish sign in.
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

          <Link to={ROUTES.LOGIN} className="w-full block">
            <Button variant="ghost" className="w-full text-xs">
              Cancel &amp; return to sign in
            </Button>
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      <div className="w-12 h-12 rounded-[var(--radius-pill)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)]/30 flex items-center justify-center mx-auto">
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
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>

      <div>
        <h1 className="font-display font-medium text-lg text-[var(--color-ink)]">
          Passwordless Verification
        </h1>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Authenticating your magic sign-in token with AuthSphere
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3 py-4">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <p className="text-xs text-[var(--color-muted)]">
            Authenticating your session securely…
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Alert variant="bad" title="Authentication Failed">
            {errorMessage}
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
