import { Metadata, type CountryCode } from "libphonenumber-js/core";
// The same full metadata react-phone-number-input/max bundles, so it isn't shipped twice.
import metadata from "libphonenumber-js/metadata.max.json";

/** `NumberingPlan.type()` exists at runtime but isn't in libphonenumber-js's typings. */
interface NumberingPlanWithTypes {
  possibleLengths(): number[];
  type?(name: string): { possibleLengths(): number[] | undefined } | undefined;
}

const maxDigitsCache = new Map<string, number | null>();

/**
 * The most national digits (no calling code, no national prefix like the "0" in Turkey) a
 * valid fixed-line or mobile number can have in `country`: 10 for Turkey, 9 for UAE mobiles.
 * Special service numbers are deliberately left out, since they can be much longer (Turkey
 * allows 13 digits) and aren't a contact number. Falls back to the country's general
 * lengths if the per-type ones aren't available. Null for an unknown country.
 */
export function maxPhoneDigits(country: string): number | null {
  if (maxDigitsCache.has(country)) return maxDigitsCache.get(country) ?? null;

  let max: number | null = null;
  try {
    const meta = new Metadata(metadata);
    meta.selectNumberingPlan(country as CountryCode);
    const plan = meta.numberingPlan as NumberingPlanWithTypes | undefined;
    if (plan) {
      const typed = ["FIXED_LINE", "MOBILE"].flatMap((name) => plan.type?.(name)?.possibleLengths() ?? []);
      const lengths = typed.length > 0 ? typed : plan.possibleLengths();
      max = lengths.length > 0 ? Math.max(...lengths) : null;
    }
  } catch {
    // selectNumberingPlan throws for countries missing from the metadata.
  }

  maxDigitsCache.set(country, max);
  return max;
}

/** The national digits of an E.164 number, or null if it doesn't carry `callingCode`. */
function nationalDigits(e164: string, callingCode: string): string | null {
  return e164.startsWith(`+${callingCode}`) ? e164.slice(callingCode.length + 1) : null;
}

/** Whether an E.164 number already has as many digits as `country` allows. */
export function isAtMaxPhoneLength(e164: string, country: string, callingCode: string): boolean {
  const max = maxPhoneDigits(country);
  const digits = nationalDigits(e164, callingCode);
  return max !== null && digits !== null && digits.length >= max;
}

/** An E.164 number cut down to `country`'s maximum length (unchanged if within it). */
export function trimPhoneToMaxLength(e164: string, country: string, callingCode: string): string {
  const max = maxPhoneDigits(country);
  const digits = nationalDigits(e164, callingCode);
  return max !== null && digits !== null && digits.length > max ? `+${callingCode}${digits.slice(0, max)}` : e164;
}
