import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Receipt } from "@/components/Receipt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, lineAmount, percentOf, rupeesToPaise } from "@/lib/money";
import { consumeNumbers, peekNumbers } from "@/lib/numbering";
import { useStore } from "@/lib/store";
import type { Bill, BillLine, BillTaxLine } from "@/lib/types";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Billing — Aadesh POS" },
      {
        name: "description",
        content:
          "Tap items to build a bill, set Dine In or Takeaway, apply a discount and print an 80mm receipt.",
      },
      { property: "og:title", content: "Billing — Aadesh POS" },
      {
        property: "og:description",
        content: "Fast café billing with live totals and 80mm thermal receipts.",
      },
    ],
  }),
  component: Pos,
});

type CartLine = { key: string; name: string; unitPricePaise: number; qty: number };

function Pos() {
  const { ready, business, menu, bills, setBills, saveBusiness } = useStore();
  const billsRef = useRef(bills);
  useEffect(() => {
    billsRef.current = bills;
  }, [bills]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [discount, setDiscount] = useState("");
  const [preview, setPreview] = useState<Bill | null>(null);

  const cur = business.currencySymbol || "₹";

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((i) => set.add(i.category?.trim() || "Uncategorised"));
    return [...set].sort((a, b) =>
      a === "Uncategorised" ? 1 : b === "Uncategorised" ? -1 : a.localeCompare(b),
    );
  }, [menu]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu
      .filter((m) => (q ? m.name.toLowerCase().includes(q) : true))
      .filter((m) =>
        activeCategory === "all"
          ? true
          : (m.category?.trim() || "Uncategorised") === activeCategory,
      );
  }, [menu, query, activeCategory]);

  function add(name: string, unitPricePaise: number) {
    setCart((prev) => {
      const key = `${name}|${unitPricePaise}`;
      const found = prev.find((l) => l.key === key);
      if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { key, name, unitPricePaise, qty: 1 }];
    });
  }

  function bump(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  const subTotalPaise = cart.reduce((s, l) => s + lineAmount(l.qty, l.unitPricePaise), 0);
  const discountPaise = Math.min(Math.max(rupeesToPaise(discount), 0), subTotalPaise);
  const taxableBase = subTotalPaise - discountPaise;
  const taxLines: BillTaxLine[] = business.taxEnabled
    ? business.taxComponents.map((t) => ({
        name: t.name,
        percent: t.percent,
        amountPaise: percentOf(taxableBase, t.percent),
      }))
    : [];
  const taxPaise = taxLines.reduce((s, t) => s + t.amountPaise, 0);
  const grandTotalPaise = taxableBase + taxPaise;
  const totalQty = cart.reduce((s, l) => s + l.qty, 0);

  const next = ready ? peekNumbers(business) : { billNumber: "", tokenNumber: "" };

  function openPreview() {
    if (cart.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    const lines: BillLine[] = cart.map((l) => ({
      name: l.name,
      qty: l.qty,
      unitPricePaise: l.unitPricePaise,
      amountPaise: lineAmount(l.qty, l.unitPricePaise),
    }));
    setPreview({
      id: crypto.randomUUID(),
      customerName: customerName.trim(),
      createdAt: new Date().toISOString(),
      orderType,
      cashierName: cashierName.trim(),
      billNumber: next.billNumber,
      tokenNumber: next.tokenNumber,
      lines,
      subTotalPaise,
      discountPaise,
      taxLines,
      taxPaise,
      grandTotalPaise,
      status: "saved",
    });
  }

  /** Saves the bill first; printing never creates or loses a bill. */
  function saveBill(bill: Bill, status: Bill["status"]): Bill {
    const saved: Bill = { ...bill, status };
    const current = billsRef.current;
    const exists = current.some((b) => b.id === bill.id);
    const nextList = exists
      ? current.map((b) => (b.id === bill.id ? saved : b))
      : [saved, ...current];
    billsRef.current = nextList;
    setBills(nextList);
    if (!exists) saveBusiness(consumeNumbers(business).business);
    return saved;
  }

  function resetSale() {
    setCart([]);
    setDiscount("");
    setCustomerName("");
    setPreview(null);
  }

  function handleSave() {
    if (!preview) return;
    saveBill(preview, "saved");
    toast.success(`Bill ${preview.billNumber} saved`);
    resetSale();
  }

  function handlePrint() {
    if (!preview) return;
    // Saved first: a print failure can never lose or duplicate the bill.
    const saved = saveBill(preview, "printed");
    toast.success(`Bill ${saved.billNumber} saved — printing`);
    setTimeout(() => {
      try {
        window.print();
      } catch {
        saveBill(saved, "print_failed");
        toast.error(`Print failed for bill ${saved.billNumber} — reprint from Orders`);
      }
      resetSale();
    }, 50);
  }

  return (
    <AppShell
      title="Billing"
      description={
        ready ? `Next bill ${next.billNumber} · token ${next.tokenNumber}` : "Loading…"
      }
    >
      <div className="grid gap-6 lg:grid-cols-[180px_1fr_380px]">
        {menu.length > 0 ? (
          <aside className="no-print lg:sticky lg:top-24 h-fit">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Categories
            </div>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    activeCategory === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {c === "all" ? "All items" : c}
                </button>
              ))}
            </div>
          </aside>
        ) : null}
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              className="pl-9"
            />
          </div>

          {menu.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No menu items yet.{" "}
                <Link to="/menu" className="text-primary underline">
                  Add some items
                </Link>{" "}
                to start billing.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="space-y-2 p-4">
                    <div className="font-medium">{item.name}</div>
                    <button
                      type="button"
                      onClick={() => add(item.name, item.pricePaise)}
                      className="w-full rounded-md bg-secondary px-3 py-2 text-left text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Base · {formatMoney(item.pricePaise, cur)}
                    </button>
                    {item.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => add(`${item.name} (${o.name})`, o.pricePaise)}
                        className="w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        {o.name} · {formatMoney(o.pricePaise, cur)}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2">
              {(["dine_in", "takeaway"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={orderType === t ? "default" : "outline"}
                  onClick={() => setOrderType(t)}
                >
                  {t === "dine_in" ? "Dine In" : "Takeaway"}
                </Button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cust">Customer (optional)</Label>
                <Input
                  id="cust"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cashier">Cashier (optional)</Label>
                <Input
                  id="cashier"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Tap items to add them to this bill.
                </p>
              ) : (
                cart.map((l) => (
                  <div key={l.key} className="flex items-center gap-2 border-b border-border pb-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMoney(l.unitPricePaise, cur)} each
                      </div>
                    </div>
                    <Button size="icon" variant="outline" onClick={() => bump(l.key, -1)}>
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm tabular-nums">{l.qty}</span>
                    <Button size="icon" variant="outline" onClick={() => bump(l.key, 1)}>
                      <Plus className="size-3.5" />
                    </Button>
                    <span className="w-20 text-right text-sm tabular-nums">
                      {formatMoney(lineAmount(l.qty, l.unitPricePaise), cur)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setCart((p) => p.filter((x) => x.key !== l.key))}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="disc">Discount ({cur})</Label>
              <Input
                id="disc"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1 text-sm">
              <Row label={`Total Qty`} value={String(totalQty)} />
              <Row label="Sub Total" value={formatMoney(subTotalPaise, cur)} />
              {discountPaise > 0 ? (
                <Row label="Discount" value={`-${formatMoney(discountPaise, cur)}`} />
              ) : null}
              {taxLines.map((t) => (
                <Row
                  key={t.name}
                  label={`${t.name} (${t.percent}%)`}
                  value={formatMoney(t.amountPaise, cur)}
                />
              ))}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatMoney(grandTotalPaise, cur)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={openPreview} disabled={cart.length === 0}>
                <Printer className="size-4" /> Review &amp; print
              </Button>
              <Button variant="outline" onClick={resetSale} disabled={cart.length === 0}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="receipt-dialog max-h-[90vh] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader className="no-print">
            <DialogTitle>Receipt preview</DialogTitle>
          </DialogHeader>
          {preview ? <Receipt bill={preview} business={business} /> : null}
          <div className="no-print flex gap-2 pt-2">
            <Button className="flex-1" onClick={handlePrint}>
              <Printer className="size-4" /> Save &amp; print
            </Button>
            <Button variant="outline" onClick={handleSave}>
              Save only
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
