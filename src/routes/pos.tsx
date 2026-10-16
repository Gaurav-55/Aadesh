import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Receipt } from "@/components/Receipt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, lineAmount, percentOf, rupeesToPaise } from "@/lib/money";
import { consumeNumbers, peekNumbers } from "@/lib/numbering";
import { useStore } from "@/lib/store";
import type { Bill, BillLine, BillTaxLine } from "@/lib/types";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [printBill, setPrintBill] = useState<Bill | null>(null);
  const printingRef = useRef(false);

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

  function setQuantity(key: string, qty: number) {
    if (!Number.isSafeInteger(qty) || qty < 1) return;
    setCart((prev) => {
      const updated = prev.map((line) => line.key === key ? { ...line, qty } : line);
      const subtotal = updated.reduce((sum, line) => sum + lineAmount(line.qty, line.unitPricePaise), 0);
      return Number.isSafeInteger(subtotal) ? updated : prev;
    });
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

  function buildBill(): Bill {
    const lines: BillLine[] = cart.map((l) => ({
      name: l.name,
      qty: l.qty,
      unitPricePaise: l.unitPricePaise,
      amountPaise: lineAmount(l.qty, l.unitPricePaise),
    }));
    return {
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
    };
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
    setPrintBill(null);
  }

  function handlePrint() {
    if (!ready || cart.length === 0 || printingRef.current) return;
    printingRef.current = true;
    const bill = buildBill();
    let saved: Bill;
    try {
      saved = saveBill(bill, "saved");
    } catch {
      printingRef.current = false;
      toast.error("Could not save the bill. Free up browser storage and try again.");
      return;
    }
    // Commit a receipt outside the app layout before opening native printing.
    flushSync(() => setPrintBill(saved));
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("afterprint", finish);
      resetSale();
      printingRef.current = false;
    };
    window.addEventListener("afterprint", finish, { once: true });
    try {
      window.print();
      // Browser printing cannot confirm physical success or cancellation.
      toast.success(`Bill ${saved.billNumber} saved`);
    } catch {
      saveBill(saved, "print_failed");
      toast.error(`Print failed for bill ${saved.billNumber} — reprint from Orders`);
      finish();
    }
  }

  return (
    <AppShell
      title="Billing"
      description={
        ready ? `Next bill ${next.billNumber} · token ${next.tokenNumber}` : "Loading…"
      }
    >
      <div
        className={`grid min-w-0 gap-6 pb-20 md:pb-0 md:grid-cols-[minmax(0,1fr)_340px] ${menu.length > 0 ? "lg:grid-cols-[180px_minmax(0,1fr)_380px]" : "lg:grid-cols-[minmax(0,1fr)_380px]"}`}
      >
        {menu.length > 0 ? (
          <aside className="no-print h-fit min-w-0 md:col-span-2 lg:col-span-1 lg:sticky lg:top-24">
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
                    <button
                      type="button"
                      onClick={() => add(item.name, item.pricePaise)}
                      className="w-full rounded-md bg-secondary px-3 py-3 text-left text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {item.name}
                    </button>
                    {item.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => add(`${item.name} (${o.name})`, o.pricePaise)}
                        className="w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        {o.name}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card id="bill" className="h-fit min-w-0 scroll-mt-24 md:sticky md:top-24">
          <CardContent className="flex flex-col gap-4 p-5 md:max-h-[calc(100vh-7rem)] [&>*]:shrink-0">
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

            <div className="space-y-2 md:min-h-24 md:flex-1 md:!shrink md:overflow-y-auto md:pr-1">
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Tap items to add them to this bill.
                </p>
              ) : (
                cart.map((l) => (
                  <CheckoutLine
                    key={l.key}
                    line={l}
                    currency={cur}
                    onQuantity={(qty) => setQuantity(l.key, qty)}
                    onMinus={() => bump(l.key, -1)}
                    onPlus={() => setQuantity(l.key, l.qty + 1)}
                    onDelete={() => setCart((prev) => prev.filter((line) => line.key !== l.key))}
                  />
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
              <Button className="flex-1" onClick={handlePrint} disabled={!ready || cart.length === 0 || !!printBill}>
                <Printer className="size-4" /> Print Bill
              </Button>
              <Button variant="outline" onClick={resetSale} disabled={cart.length === 0}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {cart.length > 0 ? (
        <a
          href="#bill"
          className="no-print fixed inset-x-3 bottom-3 z-30 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg md:hidden"
        >
          <span className="text-sm font-medium">
            {cart.reduce((s, l) => s + l.qty, 0)} items · View bill
          </span>
          <span className="font-semibold tabular-nums">{formatMoney(grandTotalPaise, cur)}</span>
        </a>
      ) : null}

      {printBill ? createPortal(
        <div className="pos-print-area"><Receipt bill={printBill} business={business} /></div>,
        document.body,
      ) : null}
    </AppShell>
  );
}

function CheckoutLine({ line, currency, onQuantity, onMinus, onPlus, onDelete }: {
  line: CartLine;
  currency: string;
  onQuantity: (qty: number) => void;
  onMinus: () => void;
  onPlus: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(String(line.qty));
  useEffect(() => setDraft(String(line.qty)), [line.qty]);
  return (
    <div className="checkout-line min-w-0 space-y-2 border-b border-border py-3">
      <div className="min-w-0 whitespace-normal text-sm font-medium leading-snug [overflow-wrap:anywhere]">{line.name}</div>
      <div className="grid min-w-0 grid-cols-[2rem_3.5rem_2rem_minmax(0,1fr)_2rem] items-center gap-1.5">
        <Button className="size-8" size="icon" variant="outline" aria-label={`Decrease ${line.name}`} title="Decrease quantity" onClick={onMinus}>
          <Minus className="size-3.5" />
        </Button>
        <Input
          aria-label={`Quantity for ${line.name}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="h-8 min-w-0 px-1 text-center tabular-nums"
          value={draft}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "") { setDraft(""); return; }
            if (!/^\d+$/.test(value)) return;
            const qty = Number(value);
            if (!Number.isSafeInteger(qty) || qty < 1 || !Number.isSafeInteger(lineAmount(qty, line.unitPricePaise))) return;
            setDraft(value);
            onQuantity(qty);
          }}
          onBlur={() => setDraft(String(line.qty))}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        />
        <Button className="size-8" size="icon" variant="outline" aria-label={`Increase ${line.name}`} title="Increase quantity" onClick={onPlus}>
          <Plus className="size-3.5" />
        </Button>
        <span className="min-w-0 text-right text-sm tabular-nums [overflow-wrap:anywhere]">{formatMoney(lineAmount(line.qty, line.unitPricePaise), currency)}</span>
        <Button className="size-8" size="icon" variant="ghost" aria-label={`Remove ${line.name}`} title="Remove item" onClick={onDelete}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
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
