/**
 * Single source of truth for presentation formatters across AuthSphere.
 */

export const formatClient = (ua?: string | null): string => {
  if (!ua) return "Unknown Client";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg/")) return "Google Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Apple Safari";
  if (ua.includes("PostmanRuntime")) return "Postman";
  if (ua.includes("curl/")) return "cURL";
  return ua.length > 32 ? `${ua.slice(0, 32)}…` : ua;
};

export const formatEventType = (type: string): string => {
  if (!type) return "—";
  return type.replace(/_/g, " ").toLowerCase();
};

export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (date: string | Date | undefined): string => {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
