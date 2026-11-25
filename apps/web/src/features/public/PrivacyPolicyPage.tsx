import React from "react";
import { Link } from "react-router-dom";
import { ROUTES, DOCS_URLS } from "../../routes/routes.config.js";
import { Button } from "../../components/ui/Button.js";

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-accent-soft selection:text-ink">
      {/* Navigation Header */}
      <header className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-rule">
        <Link to={ROUTES.ROOT} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-pill bg-paper-2 border border-rule flex items-center justify-center text-accent group-hover:border-accent transition-colors">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="font-display font-medium text-ink tracking-tight text-base">
            AuthSphere
          </span>
        </Link>

        <Link to={ROUTES.ROOT}>
          <Button variant="outline" size="sm">
            ← Home
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14 flex-1">
        <article className="space-y-6 sm:space-y-8 text-ink leading-relaxed">
          <div className="space-y-1 pb-4 sm:pb-5 border-b border-rule">
            <h1 className="font-display font-medium text-xl sm:text-3xl text-ink tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-2xs font-mono text-muted">
              Last updated: November 2026
            </p>
          </div>

          {/* 1. Overview */}
          <section className="space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              1. Overview
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              AuthSphere provides user authentication and session management.
              This policy outlines what personal information is collected when
              you create an account or sign in, how that information is used,
              and how you can manage it.
            </p>
          </section>

          {/* 2. Information Collected */}
          <section className="space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              2. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              We collect only the information necessary to provide
              authentication services:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-muted">
              <li>
                <strong className="text-ink">Account Details:</strong> Your
                email address, name, and encrypted password credentials when
                registering directly.
              </li>
              <li>
                <strong className="text-ink">
                  Third-Party Sign-In (Google &amp; GitHub):
                </strong>{" "}
                When you sign in through Google or GitHub, we receive basic
                identity profile details (email address, name, and public
                profile ID) to authenticate and link your account. We do not
                access your private messages, contacts, files, or external data.
              </li>
              <li>
                <strong className="text-ink">
                  Security &amp; Session Logs:
                </strong>{" "}
                IP addresses, device user agents, and sign-in timestamps
                recorded to display your active sessions and protect against
                unauthorized access.
              </li>
            </ul>
          </section>

          {/* 3. Google API Services Compliance */}
          <section className="space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              3. Google API User Data Policy
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              AuthSphere’s use of information received from Google APIs adheres
              to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4 hover:brightness-110"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Information received
              through Google OAuth is used solely to authenticate your account
              and is never used for generalized advertising or external
              distribution.
            </p>
          </section>

          {/* 4. How Information Is Used */}
          <section className="space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              4. How We Use Information
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Your information is used strictly to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-muted">
              <li>
                Authenticate your account and maintain active sign-in sessions.
              </li>
              <li>
                Send critical transactional notifications (such as verification
                links and password resets).
              </li>
              <li>
                Enforce multi-factor verification and account security rules.
              </li>
            </ul>
            <p className="text-xs sm:text-sm text-muted">
              We do not sell, rent, or trade your personal information to third
              parties, brokers, or advertisers.
            </p>
          </section>

          {/* 5. User Controls */}
          <section className="space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              5. Your Controls and Choices
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              You have direct control over your authentication methods and data:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-muted">
              <li>
                <strong>Disconnect Social Logins:</strong> You can disconnect
                your linked Google or GitHub accounts at any time from your
                Security settings, provided another sign-in method is active.
              </li>
              <li>
                <strong>Revoke Sessions:</strong> You can view all currently
                active devices and end sessions from the Sessions page.
              </li>
              <li>
                <strong>Revoke Google Access:</strong> You can also revoke
                AuthSphere’s permissions at any time via your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-4 hover:brightness-110"
                >
                  Google Account Permissions
                </a>{" "}
                dashboard.
              </li>
              <li>
                <strong>Account Deletion:</strong> You may request complete
                deletion of your account and stored data by contacting the
                system administrator.
              </li>
            </ul>
          </section>

          {/* 6. Security */}
          <section className="space-y-2">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              6. Data Security
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              We implement industry-standard security safeguards. Web traffic is
              encrypted over HTTPS, passwords are never stored in plain text,
              and authentication tokens are isolated within secure browser
              cookies.
            </p>
          </section>

          {/* 7. Contact */}
          <section className="space-y-2 pt-4 sm:pt-6 border-t border-rule">
            <h2 className="font-display font-medium text-sm sm:text-base text-ink">
              7. Contact
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              If you have questions regarding this Privacy Policy or wish to
              request data deletion, please contact the application
              administrator.
            </p>
          </section>
        </article>
      </main>

      {/* Global Footer */}
      <footer className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-rule text-xs text-muted">
        <span className="font-mono text-2xs">AuthSphere</span>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-2xs">
          <Link to={ROUTES.ROOT} className="hover:text-ink transition-colors">
            Home
          </Link>
          <a
            href={DOCS_URLS.SWAGGER}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            API Reference
          </a>
          <Link to={ROUTES.LOGIN} className="hover:text-ink transition-colors">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
};
