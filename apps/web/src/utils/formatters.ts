/**
 * Single source of truth for presentation formatters across AuthSphere.
 */

export const formatClient = (ua: string): string => {
  if (!ua) return "Unknown Client";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg/")) return "Google Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Apple Safari";
  return ua.slice(0, 32);
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
