"use client";

import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";

/** A two-column multi-select of checkboxes (e.g. roles or permissions). */
export function CheckboxList<V extends string>({
  idPrefix,
  options,
  value,
  onChange,
  isDisabled,
  hint,
}: {
  idPrefix: string;
  options: V[];
  value: V[];
  onChange: (value: V[]) => void;
  isDisabled?: (option: V) => boolean;
  /** Muted text shown after an option's label (e.g. "via role"). */
  hint?: (option: V) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <FieldLabel key={option} htmlFor={`${idPrefix}-${option}`} className="flex items-center gap-2 font-normal">
          <Checkbox
            id={`${idPrefix}-${option}`}
            checked={value.includes(option)}
            disabled={isDisabled?.(option)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...value, option] : value.filter((entry) => entry !== option))
            }
          />
          {option}
          {hint?.(option) && <span className="text-xs text-muted-foreground">{hint(option)}</span>}
        </FieldLabel>
      ))}
    </div>
  );
}
