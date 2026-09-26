"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required."),
    email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    password_confirmation: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

// Laravel validation errors use this key; react-hook-form field names can't contain
// dots easily so we map it directly since it already matches our field name.
const KNOWN_FIELDS = ["name", "email", "password", "password_confirmation"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", password_confirmation: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      await registerUser(values.name, values.email, values.password, values.password_confirmation);
      toast.success("Account created!");
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          for (const [field, messages] of Object.entries(error.errors)) {
            if ((KNOWN_FIELDS as readonly string[]).includes(field)) {
              setError(field as (typeof KNOWN_FIELDS)[number], { message: messages[0] });
            }
          }
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Join Bayan to start learning.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name || undefined}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.email || undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={!!errors.password || undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>

              <Field data-invalid={!!errors.password_confirmation || undefined}>
                <FieldLabel htmlFor="password_confirmation">Confirm password</FieldLabel>
                <Input
                  id="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password_confirmation}
                  {...register("password_confirmation")}
                />
                <FieldError errors={[errors.password_confirmation]} />
              </Field>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating account..." : "Sign up"}
              </Button>
            </FieldGroup>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
