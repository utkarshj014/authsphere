import axios from "axios";

/**
 * Standard AuthSphere API Client
 *
 * Architecture Invariant (No Custom Domain):
 * - Default baseURL: "/api", routing directly through Vercel Edge Reverse Proxy rewrites.
 * - Same-Origin Security: The browser only communicates with https://<project>.vercel.app/api/*,
 *   guaranteeing first-party cookie handling (SameSite=Lax), zero third-party cookie blocking in
 *   Safari ITP / Chrome, and eliminating cross-origin CORS preflight latency.
 * - withCredentials: true ensures HttpOnly session and access tokens flow securely.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
