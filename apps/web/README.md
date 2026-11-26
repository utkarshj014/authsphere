# @authsphere/web

Frontend single-page application (SPA) and security control plane for AuthSphere.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, and **Zustand**.

## Overview

- **Authentication Control Plane:** Self-service registration, password and magic-link authentication, Google & GitHub OAuth 2.0 PKCE, and TOTP multi-factor authentication with recovery codes.
- **Session & Device Governance:** Real-time active session listing, device identification, remote session revocation, and security audit log ledger.
- **Role-Based Access Control (RBAC):** Admin dashboard for inspecting and managing dynamic role permissions (`USER`, `ADMIN`).
- **Edge Deployment:** Vercel edge proxy configuration (`vercel.ts`) routing `/api/*` requests to the AWS Lambda backend.

## Development

```bash
# Start Vite development server on :5173
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
```

For full system architecture and design specifications, see [`docs/FRONTEND_ARCHITECTURE.md`](../../docs/FRONTEND_ARCHITECTURE.md).
