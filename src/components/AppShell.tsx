import { Link } from "@tanstack/react-router";
import { BarChart3, History, Receipt, Settings, Store, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Home", icon: Store },
  { to: "/pos", label: "Billing", icon: Receipt },
  { to: "/orders", label: "Orders", icon: History },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-xl font-semibold leading-none tracking-tight">
                Aadesh
              </span>
              <span className="mt-1 text-[10px] font-medium leading-none text-muted-foreground">
                Every Order. In Control.
              </span>
            </span>
          </Link>
          <nav className="-mx-1 flex w-full items-center gap-1 overflow-x-auto sm:mx-0 sm:ml-auto sm:w-auto">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
                activeOptions={{ exact: to === "/" }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-8">
        <div className="no-print mb-6">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
