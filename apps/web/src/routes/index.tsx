import React, { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Layouts & Guards
import { AuthLayout } from "../components/layout/AuthLayout.js";
import { AppShell } from "../components/layout/AppShell.js";
import { AuthGuard } from "./guards/AuthGuard.js";
import { GuestGuard } from "./guards/GuestGuard.js";
import { RoleGuard } from "./guards/RoleGuard.js";
import { RootErrorBoundary } from "./guards/RootErrorBoundary.js";
import { ROLES, PERMISSIONS } from "../types/auth.types.js";

// Lazy-Loaded Feature Pages (Code-split chunks)
const LoginPage = lazy(() =>
  import("../features/auth/LoginPage.js").then((m) => ({
    default: m.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("../features/auth/RegisterPage.js").then((m) => ({
    default: m.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("../features/auth/ForgotPasswordPage.js").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("../features/auth/ResetPasswordPage.js").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("../features/auth/VerifyEmailPage.js").then((m) => ({
    default: m.VerifyEmailPage,
  })),
);
const MagicLinkVerifyPage = lazy(() =>
  import("../features/auth/MagicLinkVerifyPage.js").then((m) => ({
    default: m.MagicLinkVerifyPage,
  })),
);

const OverviewPage = lazy(() =>
  import("../features/overview/OverviewPage.js").then((m) => ({
    default: m.OverviewPage,
  })),
);
const SecurityPage = lazy(() =>
  import("../features/security/SecurityPage.js").then((m) => ({
    default: m.SecurityPage,
  })),
);
const SessionsPage = lazy(() =>
  import("../features/sessions/SessionsPage.js").then((m) => ({
    default: m.SessionsPage,
  })),
);
const ActivityPage = lazy(() =>
  import("../features/activity/ActivityPage.js").then((m) => ({
    default: m.ActivityPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("../features/admin/AdminUsersPage.js").then((m) => ({
    default: m.AdminUsersPage,
  })),
);
const AdminRolesPage = lazy(() =>
  import("../features/admin/AdminRolesPage.js").then((m) => ({
    default: m.AdminRolesPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("../features/common/NotFoundPage.js").then((m) => ({
    default: m.NotFoundPage,
  })),
);
const HomePage = lazy(() =>
  import("../features/public/HomePage.js").then((m) => ({
    default: m.HomePage,
  })),
);
const PrivacyPolicyPage = lazy(() =>
  import("../features/public/PrivacyPolicyPage.js").then((m) => ({
    default: m.PrivacyPolicyPage,
  })),
);

const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RootErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div className="min-h-screen bg-paper" />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: "privacy",
        element: (
          <Suspense fallback={<div className="min-h-screen bg-paper" />}>
            <PrivacyPolicyPage />
          </Suspense>
        ),
      },
      // Authentication & Token Verification Shell (Single persistent AuthLayout)
      {
        element: <AuthLayout />,
        children: [
          // Guest-Only Auth Forms (Redirect to Console if already authenticated)
          {
            element: <GuestGuard />,
            children: [
              { path: "login", element: <LoginPage /> },
              { path: "register", element: <RegisterPage /> },
              { path: "forgot-password", element: <ForgotPasswordPage /> },
            ],
          },
          // Action / Token Verification Routes (Accessible regardless of current session state)
          { path: "reset-password", element: <ResetPasswordPage /> },
          { path: "verify-email", element: <VerifyEmailPage /> },
          { path: "magic-link/verify", element: <MagicLinkVerifyPage /> },
        ],
      },
      // Authenticated Protected Routes
      {
        element: <AuthGuard />,
        children: [
          {
            path: "app",
            element: <AppShell />,
            children: [
              { index: true, element: <OverviewPage /> },
              { path: "security", element: <SecurityPage /> },
              { path: "sessions", element: <SessionsPage /> },
              { path: "activity", element: <ActivityPage /> },
              // User Directory (Accessible to ADMIN or principals with user.read)
              {
                element: (
                  <RoleGuard
                    allowedRole={ROLES.ADMIN}
                    requiredPermission={PERMISSIONS.USER_READ}
                  />
                ),
                children: [{ path: "users", element: <AdminUsersPage /> }],
              },
              // Role Governance (Restricted to ADMIN role)
              {
                element: <RoleGuard allowedRole={ROLES.ADMIN} />,
                children: [
                  { path: "admin/roles", element: <AdminRolesPage /> },
                ],
              },
            ],
          },
        ],
      },
      // 404 Not Found Catch-All
      {
        path: "*",
        element: (
          <Suspense fallback={null}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);

/**
 * Top-level application router component for React Fast Refresh compatibility
 */
export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
