export function getDay(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).getDate();
}

export function getMonth(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-NZ", { month: "short" });
}

/**
 * True if `dateStr` is today or later, compared by calendar date only (not
 * time/timezone) — the API stores event dates as UTC midnight, so comparing
 * full Date objects directly can shift a same-day event a day off depending
 * on the visitor's timezone.
 */
export function isUpcoming(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const eventYMD = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const now = new Date();
  const todayYMD = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return eventYMD >= todayYMD;
}
