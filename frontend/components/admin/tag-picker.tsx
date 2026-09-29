"use client";

import { useState, type SyntheticEvent } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/admin/admin-ui";
import { TagBadge } from "@/components/admin/user-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import type { Tag } from "@/lib/types";

/** Palette new tags cycle through; the API accepts any #rrggbb value. */
const TAG_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];

interface TagPickerProps {
  /** Every tag that exists (GET /tags). */
  allTags: Tag[];
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  /** Called with a tag created here, so the caller can add it to `allTags`. */
  onTagCreated: (tag: Tag) => void;
  disabled?: boolean;
}

/** Selected tags as removable chips, plus a select to add an existing tag or create a new one. */
export function TagPicker({ allTags, value, onChange, onTagCreated, disabled }: TagPickerProps) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedIds = new Set(value.map((tag) => tag.id));
  const available = allTags.filter((tag) => !selectedIds.has(tag.id));

  async function createTag(event: SyntheticEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    const existing = allTags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.has(existing.id)) onChange([...value, existing]);
      setNewName("");
      return;
    }

    setCreating(true);
    try {
      const tag = await api.post<Tag>("/tags", { name, color: TAG_COLORS[allTags.length % TAG_COLORS.length] });
      onTagCreated(tag);
      onChange([...value, tag]);
      setNewName("");
      toast.success(`Created tag "${tag.name}".`);
    } catch (err) {
      toast.error(err instanceof ApiError ? (err.fieldError("name") ?? err.message) : "Could not create this tag.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-5 flex-wrap gap-1.5">
        {value.length === 0 ? (
          <span className="text-sm text-muted-foreground">No tags.</span>
        ) : (
          value.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              disabled={disabled}
              onRemove={disabled ? undefined : () => onChange(value.filter((entry) => entry.id !== tag.id))}
            />
          ))
        )}
      </div>

      {!disabled && (
        <div className="flex flex-col gap-2">
          <NativeSelect
            aria-label="Add a tag"
            value=""
            disabled={available.length === 0}
            onChange={(event) => {
              const tag = allTags.find((entry) => String(entry.id) === event.target.value);
              if (tag) onChange([...value, tag]);
            }}
          >
            <option value="">{available.length ? "Add a tag…" : "No other tags"}</option>
            {available.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </NativeSelect>
          {/* Not a nested <form>: the picker also sits inside the create-user form. */}
          <div className="flex gap-2">
            <Input
              placeholder="New tag name"
              aria-label="New tag name"
              maxLength={50}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createTag(event);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Create tag"
              disabled={creating || !newName.trim()}
              onClick={(event) => void createTag(event)}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
