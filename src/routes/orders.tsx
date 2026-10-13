import { createFileRoute, Link } from "@tanstack/react-router";
import { FileSpreadsheet, Printer, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Receipt } from "@/components/Receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { exportOrdersToExcel } from "@/lib/export-orders";
import { formatMoney } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { Bill } from "@/lib/types";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Orders History — Aadesh" },
      {
        name: "description",
        content:
          "Browse past bills, review saved receipts and reprint any order without creating a new bill.",
      },
      { property: "og:title", content: "Orders History — Aadesh" },
      {
        property: "og:description",
        content: "Past bills with one-tap reprint of the original saved receipt.",
      },
    ],
  }),
  component: Orders,
});

const statusLabel: Record<Bill["status"], string> = {
  saved: "Saved",
  printed: "Printed",
  print_failed: "Print failed",
};

function Orders() {
  const { business, bills, setBills } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Bill | null>(null);
  const cur = business.currencySymbol || "₹";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(
      (b) =>
        b.billNumber.toLowerCase().includes(q) ||
        b.tokenNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.lines.some((l) => l.name.toLowerCase().includes(q)),
    );
  }, [bills, query]);

  const todayTotal = useMemo(() => {
    const d = new Date().toDateString();
    return bills
      .filter((b) => new Date(b.createdAt).toDateString() === d)
      .reduce((s, b) => s + b.grandTotalPaise, 0);
  }, [bills]);

  /** Reprints the saved bill — never creates a new one, never touches counters. */
  function reprint(bill: Bill) {
    setOpen(bill);
    setTimeout(() => {
      window.print();
      setBills(
        bills.map((b) => (b.id === bill.id ? { ...b, status: "printed" as const } : b)),
      );
    }, 250);
  }

  function remove(bill: Bill) {
    setBills(bills.filter((b) => b.id !== bill.id));
    toast.success(`Bill ${bill.billNumber} deleted`);
  }

  return (
    <AppShell
      title="Orders"
      description={`${bills.length} bill${bills.length === 1 ? "" : "s"} saved · today ${formatMoney(todayTotal, cur)}`}
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bill no., token, customer or item…"
          className="pl-9"
        />
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No bills yet.{" "}
            <Link to="/pos" className="text-primary underline">
              Start billing
            </Link>{" "}
            to see orders here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map((b) => {
            const at = new Date(b.createdAt);
            return (
              <Card key={b.id}>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-40 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{b.billNumber}</span>
                      <Badge variant="secondary">Token {b.tokenNumber}</Badge>
                      <Badge variant={b.status === "print_failed" ? "destructive" : "outline"}>
                        {statusLabel[b.status]}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {at.toLocaleString("en-IN")} ·{" "}
                      {b.orderType === "dine_in" ? "Dine In" : "Takeaway"}
                      {b.customerName ? ` · ${b.customerName}` : ""}
                    </div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {b.lines.map((l) => `${l.name} ×${l.qty}`).join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {formatMoney(b.grandTotalPaise, cur)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.lines.reduce((s, l) => s + l.qty, 0)} items
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(b)}>
                      View
                    </Button>
                    <Button onClick={() => reprint(b)}>
                      <Printer className="size-4" /> Reprint
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(b)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="receipt-dialog max-h-[90vh] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader className="no-print">
            <DialogTitle>Bill {open?.billNumber}</DialogTitle>
          </DialogHeader>
          {open ? <Receipt bill={open} business={business} /> : null}
          <div className="no-print pt-2">
            <Button className="w-full" onClick={() => open && reprint(open)}>
              <Printer className="size-4" /> Reprint
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
