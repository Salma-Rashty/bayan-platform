import type { ReactNode } from "react";
import { XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Role, Tag, UserStatus } from "@/lib/types";

export function UserStatusBadge({ status, deleted }: { status?: UserStatus; deleted?: boolean }) {
  if (deleted) return <Badge variant="outline">Deleted</Badge>;
  if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
  return <Badge variant="secondary">Active</Badge>;
}

export function RoleBadges({ roles }: { roles: Role[] }) {
  if (roles.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role} variant={role === "student" ? "outline" : "secondary"}>
          {role}
        </Badge>
      ))}
    </div>
  );
}

/** A tag chip with a dot in the tag's colour; pass `onRemove` to show a remove button. */
export function TagBadge({ tag, onRemove, disabled }: { tag: Tag; onRemove?: () => void; disabled?: boolean }) {
  return (
    <Badge variant="outline" className={onRemove ? "pr-1" : undefined}>
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full bg-muted-foreground"
        style={tag.color ? { backgroundColor: tag.color } : undefined}
      />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove tag ${tag.name}`}
          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </Badge>
  );
}

export function TagList({ tags, empty = "—" }: { tags: Tag[]; empty?: ReactNode }) {
  if (tags.length === 0) return <span className="text-muted-foreground">{empty}</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </div>
  );
}
