"use client";

import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <form action={loginAction} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@xfinitys.my.id"
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
        />
      </Field>
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-transparent bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full">
        Masuk
      </Button>
    </form>
  );
}
