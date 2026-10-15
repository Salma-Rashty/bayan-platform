"use client";

import { useEffect, type ComponentProps, type ComponentType } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import flags from "react-phone-number-input/flags";
// Full metadata, so numbers are checked against each country's real formats, not just lengths.
import PhoneInput, { getCountryCallingCode, type Country } from "react-phone-number-input/max";
import "react-phone-number-input/style.css";

import { isAtMaxPhoneLength, trimPhoneToMaxLength } from "@/lib/phone-length";
import { countryName, isValidPhoneForCountry } from "@/lib/teacher-application-form";

interface CountrySelectProps {
  value?: Country;
  onChange: (country?: Country) => void;
  options: { value?: Country; label: string; divider?: boolean }[];
  iconComponent: ComponentType<{ country?: Country; label: string; "aria-hidden"?: boolean }>;
  disabled?: boolean;
  readOnly?: boolean;
  onFocus?: ComponentProps<"select">["onFocus"];
  onBlur?: ComponentProps<"select">["onBlur"];
}

/**
 * Flag + calling code (e.g. "+90") over an invisible native select, so the full country
 * list stays a native, accessible picker.
 */
function CountryCodeSelect({ value, onChange, options, iconComponent: Icon, disabled, readOnly, onFocus, onBlur }: CountrySelectProps) {
  const selected = options.find((option) => !option.divider && option.value === value);

  return (
    <div className="relative mr-2 flex shrink-0 items-center gap-1.5 self-stretch border-r pr-2 text-sm text-foreground">
      <select
        aria-label="Phone country"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value ?? "ZZ"}
        disabled={disabled || readOnly}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value === "ZZ" ? undefined : (event.target.value as Country))}
      >
        {!value && (
          <option value="ZZ" disabled>
            Select a country
          </option>
        )}
        {options.map((option) =>
          option.divider ? (
            <option key="|" value="|" disabled>
              ──────────
            </option>
          ) : (
            <option key={option.value ?? "ZZ"} value={option.value ?? "ZZ"}>
              {option.label}
            </option>
          )
        )}
      </select>
      {value && selected ? (
        <>
          <Icon aria-hidden country={value} label={selected.label} />
          <span className="tabular-nums">+{getCountryCallingCode(value)}</span>
        </>
      ) : (
        <span className="text-muted-foreground">Country</span>
      )}
      <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden />
    </div>
  );
}

/**
 * The number itself, unstyled: the wrapper below draws the input chrome. Once the number is
 * as long as the country allows, further digits are dropped before they reach the input
 * (typing over a selection still works).
 */
function BareInput({ atMaxLength, onBeforeInput, ...props }: ComponentProps<"input"> & { atMaxLength?: boolean }) {
  return (
    <input
      {...props}
      onBeforeInput={(event) => {
        const input = event.currentTarget;
        const insertsDigit = /\d/.test(event.data ?? "");
        if (atMaxLength && insertsDigit && input.selectionStart === input.selectionEnd) {
          event.preventDefault();
          return;
        }
        onBeforeInput?.(event);
      }}
      className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
    />
  );
}

/**
 * International phone input: pick the country, then type the national number. `value` is
 * E.164 (e.g. "+905551234567") or undefined; the number is checked live against the
 * selected country's formats with libphonenumber (the API re-checks with the same rules).
 */
export function PhoneField({
  id,
  value,
  onChange,
  country,
  onCountryChange,
  defaultCountry,
  invalid,
  onBlur,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  country: string;
  onCountryChange: (country: string) => void;
  /** Followed until the applicant picks a country or types a number (e.g. their nationality). */
  defaultCountry?: string;
  invalid: boolean;
  onBlur: () => void;
}) {
  const valid = !!value && !!country && isValidPhoneForCountry(value, country);
  const callingCode = country ? getCountryCallingCode(country as Country) : "";
  const atMaxLength = !!value && !!country && isAtMaxPhoneLength(value, country, callingCode);

  // Re-apply the limit when the country changes: digits that fit one country can be too many
  // for another. (Pastes and autofill are trimmed in onChange below.)
  useEffect(() => {
    if (!value || !country) return;
    const trimmed = trimPhoneToMaxLength(value, country, callingCode);
    if (trimmed !== value) onChange(trimmed);
  }, [country, callingCode, value, onChange]);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        aria-invalid={invalid || undefined}
        className="flex h-8 w-full min-w-0 items-center rounded-lg border border-input bg-transparent px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
      >
        <PhoneInput
          id={id}
          className="flex h-full w-full items-center"
          value={value || undefined}
          onChange={(next) => onChange(next && country ? trimPhoneToMaxLength(next, country, callingCode) : (next ?? ""))}
          onCountryChange={(next) => onCountryChange(next ?? "")}
          defaultCountry={(defaultCountry || undefined) as Country | undefined}
          addInternationalOption={false}
          flags={flags}
          countrySelectComponent={CountryCodeSelect}
          inputComponent={BareInput}
          numberInputProps={{ atMaxLength }}
          // A trimmed value is fed back in as E.164; keep showing it the way it was typed.
          initialValueFormat="national"
          autoComplete="tel"
          placeholder="Phone number"
          aria-invalid={invalid || undefined}
          onBlur={onBlur}
        />
      </div>
      {valid && !invalid && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckIcon className="size-3.5 text-primary" aria-hidden />
          Valid number for {countryName(country)}
        </p>
      )}
    </div>
  );
}
