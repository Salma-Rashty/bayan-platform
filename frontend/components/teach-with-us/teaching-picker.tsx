"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { AGE_GROUPS, type SelectionErrors, type Selections } from "@/lib/teacher-application-form";
import type { AgeGroup, TeacherApplicationCatalogCategory } from "@/lib/types";

function toggle<T>(list: T[], value: T, on: boolean): T[] {
  return on ? [...list, value] : list.filter((entry) => entry !== value);
}

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

function AgeGroupChecks({
  idPrefix,
  label,
  value,
  onChange,
  error,
}: {
  idPrefix: string;
  label: string;
  value: AgeGroup[];
  onChange: (value: AgeGroup[]) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {AGE_GROUPS.map((group) => (
          <FieldLabel key={group.value} htmlFor={`${idPrefix}-${group.value}`} className="flex items-center gap-2 font-normal">
            <Checkbox
              id={`${idPrefix}-${group.value}`}
              checked={value.includes(group.value)}
              aria-invalid={!!error || undefined}
              onCheckedChange={(checked) => onChange(toggle(value, group.value, checked))}
            />
            {group.label}
          </FieldLabel>
        ))}
      </div>
      <ErrorText message={error} />
    </fieldset>
  );
}

/**
 * Category checkboxes from the live catalog. Inactive entries are included and look exactly like
 * active ones (no label says why). A chosen category with levels shows its levels,
 * and each chosen level its age groups; a category without levels shows age groups directly.
 */
export function TeachingPicker({
  catalog,
  value,
  onChange,
  errors,
}: {
  catalog: TeacherApplicationCatalogCategory[];
  value: Selections;
  onChange: (value: Selections) => void;
  errors: SelectionErrors;
}) {
  function setCategory(id: number, on: boolean) {
    const next = { ...value };
    if (on) next[id] = { levels: {}, ageGroups: [] };
    else delete next[id];
    onChange(next);
  }

  function update(id: number, patch: Partial<Selections[number]>) {
    onChange({ ...value, [id]: { ...value[id], ...patch } });
  }

  if (catalog.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        We aren&apos;t taking applications for any subjects right now. Please check back soon.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {catalog.map((category) => {
        const selection = value[category.id];
        const categoryError = errors[`category.${category.id}`];

        return (
          <div key={category.id} className="rounded-lg border p-3">
            <FieldLabel htmlFor={`category-${category.id}`} className="flex items-start gap-3 font-normal">
              <Checkbox
                id={`category-${category.id}`}
                className="mt-0.5"
                checked={!!selection}
                onCheckedChange={(checked) => setCategory(category.id, checked)}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">{category.name}</span>
                {category.description && (
                  <span className="text-sm text-muted-foreground">{category.description}</span>
                )}
              </span>
            </FieldLabel>

            {selection && (
              <div className="mt-3 flex flex-col gap-3 border-t pt-3 pl-7">
                {category.has_levels ? (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-xs font-medium text-muted-foreground">
                      Which levels can you teach?
                    </legend>
                    {category.levels.map((level) => {
                      const ageGroups = selection.levels[level.id];
                      return (
                        <div key={level.id} className="flex flex-col gap-2">
                          <FieldLabel htmlFor={`level-${level.id}`} className="flex items-center gap-2 font-normal">
                            <Checkbox
                              id={`level-${level.id}`}
                              checked={!!ageGroups}
                              aria-invalid={!!categoryError || undefined}
                              onCheckedChange={(checked) => {
                                const levels = { ...selection.levels };
                                if (checked) levels[level.id] = [];
                                else delete levels[level.id];
                                update(category.id, { levels });
                              }}
                            />
                            {level.name}
                          </FieldLabel>
                          {ageGroups && (
                            <div className="mb-1 ml-6 rounded-md bg-muted/50 p-3">
                              <AgeGroupChecks
                                idPrefix={`level-${level.id}-age`}
                                label={`Age groups for ${level.name}`}
                                value={ageGroups}
                                onChange={(groups) =>
                                  update(category.id, { levels: { ...selection.levels, [level.id]: groups } })
                                }
                                error={errors[`level.${level.id}`]}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <ErrorText message={categoryError} />
                  </fieldset>
                ) : (
                  <AgeGroupChecks
                    idPrefix={`category-${category.id}-age`}
                    label="Which age groups can you teach?"
                    value={selection.ageGroups}
                    onChange={(ageGroups) => update(category.id, { ageGroups })}
                    error={categoryError}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
      <ErrorText message={errors.categories} />
    </div>
  );
}
