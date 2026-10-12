"use client";

import { useState, type ReactElement } from "react";

import { NativeSelect } from "@/components/admin/admin-ui";
import { OrderHint, useTakenOrders } from "@/components/admin/catalog-ui";
import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Category, Level } from "@/lib/types";

type CategoryChoice =
  /** Pick from these (non-deleted) categories; `defaultId` preselects one for a new level. */
  | { kind: "select"; categories: Category[]; defaultId?: number }
  /** Fixed to this category, e.g. on the category's own page. */
  | { kind: "locked"; category: Pick<Category, "id" | "name"> };

interface LevelDialogProps {
  /** Omit to create a new level. */
  level?: Level;
  categoryChoice: CategoryChoice;
  trigger: ReactElement;
  onSaved: () => void;
}

export function LevelDialog({ level, categoryChoice, trigger, onSaved }: LevelDialogProps) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Blank (new levels only) lets the API assign the category's next free order.
  const [order, setOrder] = useState("");

  const { dialogProps, fieldError, save } = useFormDialog(() => {
    const initialCategory =
      categoryChoice.kind === "locked"
        ? categoryChoice.category.id
        : (level?.category_id ?? categoryChoice.defaultId ?? categoryChoice.categories[0]?.id);
    setCategoryId(initialCategory ? String(initialCategory) : "");
    setName(level?.name ?? "");
    setDescription(level?.description ?? "");
    setIsActive(level?.is_active ?? true);
    setOrder(level ? String(level.order) : "");
  });
  // Orders are unique per category, so the hint follows the selected category.
  const takenOrders = useTakenOrders(
    dialogProps.open && categoryId ? `/categories/${categoryId}/levels` : null,
    level?.id
  );

  function handleSubmit() {
    const payload = {
      // A locked category is never sent on edit, so the level can't move from here.
      ...((categoryChoice.kind === "select" || !level) && { category_id: Number(categoryId) }),
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      ...(order.trim() !== "" && { order: Number(order) }),
    };

    save(
      () => (level ? api.put(`/levels/${level.id}`, payload) : api.post("/levels", payload)),
      {
        success: level ? `Saved "${payload.name}".` : `Created level "${payload.name}".`,
        failure: "Could not save this level.",
      },
      onSaved
    );
  }

  return (
    <FormDialog
      {...dialogProps}
      trigger={trigger}
      title={level ? "Edit level" : "New level"}
      onSubmit={handleSubmit}
      submitLabel={level ? "Save changes" : "Create level"}
    >
      <Field data-invalid={!!fieldError("category_id") || undefined}>
        <FieldLabel htmlFor="level-category">Category</FieldLabel>
        {categoryChoice.kind === "locked" ? (
          <>
            <Input id="level-category" value={categoryChoice.category.name} disabled readOnly />
            <FieldDescription>
              {level ? "Move a level to another category from the Levels page." : "This level will belong to this category."}
            </FieldDescription>
          </>
        ) : (
          <NativeSelect
            id="level-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
            className="w-full"
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categoryChoice.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.is_active && " (inactive)"}
              </option>
            ))}
          </NativeSelect>
        )}
        <FieldError>{fieldError("category_id")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("name") || undefined}>
        <FieldLabel htmlFor="level-name">Name</FieldLabel>
        <Input
          id="level-name"
          maxLength={100}
          placeholder="e.g. Beginner"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <FieldDescription>Unique within its category.</FieldDescription>
        <FieldError>{fieldError("name")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("description") || undefined}>
        <FieldLabel htmlFor="level-description">Description</FieldLabel>
        <Textarea
          id="level-description"
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <FieldError>{fieldError("description")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("order") || undefined}>
        <FieldLabel htmlFor="level-order">Order</FieldLabel>
        <Input
          id="level-order"
          type="number"
          min={0}
          step={1}
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          placeholder={takenOrders.nextFree ? `Next free: ${takenOrders.nextFree}` : "Next free"}
          required={Boolean(level)}
          className="sm:max-w-40"
        />
        <FieldDescription>
          Position within the category; lower numbers come first. Unique within the category
          {level ? "" : "; leave blank to add it last"}.
        </FieldDescription>
        {!fieldError("order") && <OrderHint value={order} takenOrders={takenOrders} scope=" in this category" />}
        <FieldError>{fieldError("order")}</FieldError>
      </Field>
      <FieldLabel htmlFor="level-active" className="flex items-center gap-2 font-normal">
        <Checkbox id="level-active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked)} />
        Active
      </FieldLabel>
    </FormDialog>
  );
}
