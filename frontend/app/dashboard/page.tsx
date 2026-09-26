"use client";

import { Protected } from "@/components/protected";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

function DashboardContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm font-medium text-foreground">Your role{user.roles.length > 1 ? "s" : ""}</p>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <span
              key={role}
              className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground capitalize"
            >
              {role}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <Protected>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <DashboardContent />
      </div>
    </Protected>
  );
}
