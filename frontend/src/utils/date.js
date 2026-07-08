export function getDay(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).getDate();
}

export function getMonth(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-NZ", { month: "short" });
}
