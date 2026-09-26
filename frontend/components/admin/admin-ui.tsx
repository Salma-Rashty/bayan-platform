"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import type { Permission } from "@/lib/types";

/** Renders children only for users holding `permission`, mirroring the API policy. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>You don&apos;t have access to this section</AlertTitle>
        <AlertDescription>It requires the {permission} permission.</AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function LoadError({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error}{" "}
        <button type="button" onClick={onRetry} className="underline underline-offset-4">
          Try again
        </button>
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

/** Shown when useAllPages hit its page cap, so filters/counts only cover part of the data. */
export function TruncatedNotice({ loaded, total }: { loaded: number; total: number }) {
  return (
    <Alert>
      <AlertTitle>Showing the {loaded} most recent of {total} records</AlertTitle>
      <AlertDescription>Search and filters only cover the loaded records.</AlertDescription>
    </Alert>
  );
}

interface FilterOption<V extends string> {
  value: V;
  label: string;
  count?: number;
}

/** A row of toggle buttons for a single-choice filter (e.g. status). */
export function FilterTabs<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? "secondary" : "ghost"}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className="text-xs text-muted-foreground">{option.count}</span>}
        </Button>
      ))}
    </div>
  );
}

/** Native select styled to match Input; the shadcn set here has no Select component. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}
