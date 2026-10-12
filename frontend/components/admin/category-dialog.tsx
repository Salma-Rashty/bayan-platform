"use client";

import { useState, type ReactElement } from "react";

import { OrderHint, useTakenOrders } from "@/components/admin/catalog-ui";
import { FormDialog, useFormDialog } from "@/components/teach/form-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

interface CategoryDialogProps {
  /** Omit to create a new category. */
  category?: Category;
  trigger: ReactElement;
  onSaved: (category: Category) => void;
}

export function CategoryDialog({ category, trigger, onSaved }: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Blank (new categories only) lets the API assign the next free order.
  const [order, setOrder] = useState("");

  const { dialogProps, fieldError, save } = useFormDialog(() => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setIsActive(category?.is_active ?? true);
    setOrder(category ? String(category.order) : "");
  });
  const takenOrders = useTakenOrders(dialogProps.open ? "/categories" : null, category?.id);

  function handleSubmit() {
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      ...(order.trim() !== "" && { order: Number(order) }),
    };

    let saved: Category | null = null;
    save(
      async () => {
        saved = category
          ? await api.put<Category>(`/categories/${category.id}`, payload)
          : await api.post<Category>("/categories", payload);
      },
      {
        success: category ? `Saved "${payload.name}".` : `Created category "${payload.name}".`,
        failure: "Could not save this category.",
      },
      () => saved && onSaved(saved)
    );
  }

  return (
    <FormDialog
      {...dialogProps}
      trigger={trigger}
      title={category ? "Edit category" : "New category"}
      description={category ? undefined : "Group levels under a category, e.g. Arabic or Quran."}
      onSubmit={handleSubmit}
      submitLabel={category ? "Save changes" : "Create category"}
    >
      <Field data-invalid={!!fieldError("name") || undefined}>
        <FieldLabel htmlFor="category-name">Name</FieldLabel>
        <Input
          id="category-name"
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <FieldError>{fieldError("name")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("description") || undefined}>
        <FieldLabel htmlFor="category-description">Description</FieldLabel>
        <Textarea
          id="category-description"
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <FieldError>{fieldError("description")}</FieldError>
      </Field>
      <Field data-invalid={!!fieldError("order") || undefined}>
        <FieldLabel htmlFor="category-order">Order</FieldLabel>
        <Input
          id="category-order"
          type="number"
          min={0}
          step={1}
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          placeholder={takenOrders.nextFree ? `Next free: ${takenOrders.nextFree}` : "Next free"}
          required={Boolean(category)}
          className="sm:max-w-40"
        />
        <FieldDescription>
          Lower numbers are listed first. Each category needs its own number{category ? "" : "; leave blank to add it last"}.
        </FieldDescription>
        {!fieldError("order") && <OrderHint value={order} takenOrders={takenOrders} scope="" />}
        <FieldError>{fieldError("order")}</FieldError>
      </Field>
      <FieldLabel htmlFor="category-active" className="flex items-center gap-2 font-normal">
        <Checkbox id="category-active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked)} />
        Active
      </FieldLabel>
    </FormDialog>
  );
}
