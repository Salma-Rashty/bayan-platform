/**
 * Formats a date-only value without UTC/local timezone drift. Laravel's `date` cast
 * still serializes as a full ISO datetime (e.g. "2026-08-15T00:00:00.000000Z"), so this
 * reads only the leading YYYY-MM-DD and ignores the time/zone suffix entirely.
 */
export function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return dateString;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Formats a full datetime string (e.g. ISO 8601) in the viewer's local time. */
export function formatDateTime(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The API has no currency field, so this just formats the raw decimal string. */
export function formatPrice(price: string | null | undefined): string {
  if (price === null || price === undefined) return "—";
  const value = Number(price);
  if (Number.isNaN(value)) return price;
  if (value === 0) return "Free";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converts an API datetime to the local "YYYY-MM-DDTHH:mm" value a datetime-local input expects. */
export function toDateTimeLocalValue(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formats a decimal string from the API (e.g. a grade of "85.50" or "100.00") without trailing zeros. */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
