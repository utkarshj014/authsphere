export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)\s*([smdhwy])?$/i.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }

  const value = parseInt(match[1]!, 10);
  const unit = (match[2] || "s").toLowerCase();

  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  switch (unit) {
    case "s":
      return value * SEC;
    case "m":
      return value * MIN;
    case "h":
      return value * HOUR;
    case "d":
      return value * DAY;
    case "w":
      return value * DAY * 7;
    case "y":
      return value * DAY * 365;
    default:
      return value * SEC;
  }
}
