"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { useAuthStore } from "@/entities/auth/model/store";
import type { UserRole } from "@/shared/types/domain";

export default function LoginPage() {
  const router = useRouter();
  const { token, isReady, isLoading, error, login, register } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    if (isReady && token) {
      router.replace("/");
    }
  }, [isReady, token, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(undefined);
    try {
      if (mode === "register") {
        await register({ name: name.trim(), email: email.trim(), password, role });
      } else {
        await login({ email: email.trim(), password });
      }
      router.replace("/");
    } catch (authError) {
      setSubmitError(authError instanceof Error ? authError.message : "Authentication failed");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent p-4 text-foreground">
      <Card className="w-full max-w-sm space-y-5 p-6">
        <div>
          <p className="text-2xl font-semibold">Flowbit</p>
          <p className="mt-1 text-sm text-foreground/70">
            {mode === "login" ? "Sign in to your workspace" : "Create a new workspace account"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-muted p-1">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm transition ${mode === "login" ? "bg-surface font-medium shadow-sm" : "text-foreground/70 hover:text-foreground"}`}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm transition ${mode === "register" ? "bg-surface font-medium shadow-sm" : "text-foreground/70 hover:text-foreground"}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" required />
              <Select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                <option value="admin">admin</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </Select>
            </>
          ) : null}
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" required />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Password"
            minLength={8}
            required
          />
          {error || submitError ? (
            <p className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error ?? submitError}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
