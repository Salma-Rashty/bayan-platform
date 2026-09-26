import { Button } from "@/components/ui/button";
import type { Paginated } from "@/lib/types";

/** Previous/next controls for a paginated Laravel response; renders nothing for a single page. */
export function PaginationControls({
  meta,
  onPageChange,
}: {
  meta: Paginated<unknown>["meta"];
  onPageChange: (page: number) => void;
}) {
  if (meta.last_page <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span>
        Showing {meta.from}–{meta.to} of {meta.total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.current_page <= 1}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
