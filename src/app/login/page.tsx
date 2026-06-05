import { Suspense } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LoginForm } from "./components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <section className="hidden lg:block">
            <div className="mb-5 inline-flex rounded-md border bg-card px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm">
              Kanban em tempo real
            </div>
            <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-normal text-foreground">
              Murbi Dev Dashboard
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
              Acesso restrito ao acompanhamento operacional do fluxo Kanban.
            </p>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-operational">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-normal">Entrar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use as credenciais do painel para continuar.
              </p>
            </div>
            <Suspense>
              <LoginForm />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  );
}
