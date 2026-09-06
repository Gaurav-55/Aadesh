import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, History, Receipt, Settings, UtensilsCrossed } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aadesh — Every Order. In Control." },
      {
        name: "description",
        content:
          "Aadesh is a fast offline billing app for Indian cafés and restaurants: menu, POS, 80mm thermal receipts and order history.",
      },
      { property: "og:title", content: "Aadesh — Every Order. In Control." },
      {
        property: "og:description",
        content: "Fast billing, 80mm thermal receipts and order history for cafés in India.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { ready, business, menu, bills } = useStore();

  return (
    <AppShell
      title={ready ? business.name : "Aadesh"}
      description="Set up your business, then build your menu and start billing."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="size-4 text-primary" /> Step 1 · Business settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Name, address, phone, FSSAI, footer text, tax components and bill/token
              numbering — everything that prints on the receipt.
            </p>
            <Button asChild>
              <Link to="/settings">
                Open settings <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UtensilsCrossed className="size-4 text-primary" /> Step 2 · Menu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {menu.length} item{menu.length === 1 ? "" : "s"} so far. Add items, prices
              and variants — POS billing and receipts come next.
            </p>
            <Button asChild variant="secondary">
              <Link to="/menu">
                Manage menu <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="size-4 text-primary" /> Step 3 · Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tap items to build a bill, choose Dine In or Takeaway, apply a discount and
              print an 80mm thermal receipt.
            </p>
            <Button asChild>
              <Link to="/pos">
                Start billing <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="size-4 text-primary" /> Step 4 · Orders history
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {bills.length} bill{bills.length === 1 ? "" : "s"} saved. Search past orders
              and reprint any receipt from its saved data.
            </p>
            <Button asChild variant="secondary">
              <Link to="/orders">
                View orders <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
