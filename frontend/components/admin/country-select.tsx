import type { ComponentProps } from "react";

import { NativeSelect } from "@/components/admin/admin-ui";
import { COUNTRIES } from "@/lib/countries";

interface CountrySelectProps extends Omit<ComponentProps<"select">, "value" | "onChange"> {
  /** ISO 3166-1 alpha-2 code, or "" for none. */
  value: string;
  onChange: (code: string) => void;
  /** Label for the empty option, e.g. "Not set" or "All countries". */
  emptyLabel: string;
}

/** Country dropdown over the ISO list the API validates against. */
export function CountrySelect({ value, onChange, emptyLabel, ...props }: CountrySelectProps) {
  // A value saved before the list existed would otherwise render as blank and be lost on save.
  const unknown = value && !COUNTRIES.some((country) => country.code === value);

  return (
    <NativeSelect value={value} onChange={(event) => onChange(event.target.value)} {...props}>
      <option value="">{emptyLabel}</option>
      {unknown && <option value={value}>{value} (not in list)</option>}
      {COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </NativeSelect>
  );
}
