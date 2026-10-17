import type { Bill } from "./types";

export type RangeKey = "today" | "7d" | "1m" | "3m" | "6m" | "1y" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Inclusive [from, to] range for a preset, relative to `now`. */
export function rangeFor(key: RangeKey, now = new Date(), custom?: { from: string; to: string }) {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = startOfDay(now);
  if (key === "custom" && custom?.from && custom?.to) {
    const f = startOfDay(new Date(custom.from));
    const t = new Date(custom.to);
    t.setHours(23, 59, 59, 999);
    return { from: f, to: t };
  }
  if (key === "7d") from.setDate(from.getDate() - 6);
  if (key === "1m") from.setMonth(from.getMonth() - 1);
  if (key === "3m") from.setMonth(from.getMonth() - 3);
  if (key === "6m") from.setMonth(from.getMonth() - 6);
  if (key === "1y") from.setFullYear(from.getFullYear() - 1);
  return { from, to };
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function buildReport(bills: Bill[], from: Date, to: Date) {
  const inRange = bills.filter((b) => {
    const t = new Date(b.createdAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });

  const revenue = inRange.reduce((s, b) => s + b.grandTotalPaise, 0);
  const discount = inRange.reduce((s, b) => s + b.discountPaise, 0);
  const tax = inRange.reduce((s, b) => s + b.taxPaise, 0);
  const subTotal = inRange.reduce((s, b) => s + b.subTotalPaise, 0);
  const itemsSold = inRange.reduce((s, b) => s + b.lines.reduce((q, l) => q + l.qty, 0), 0);
  const orders = inRange.length;
  const aov = orders ? Math.round(revenue / orders) : 0;

  const dineIn = inRange.filter((b) => b.orderType === "dine_in");
  const split = {
    dineIn: { orders: dineIn.length, revenue: dineIn.reduce((s, b) => s + b.grandTotalPaise, 0) },
    takeaway: {
      orders: orders - dineIn.length,
      revenue: revenue - dineIn.reduce((s, b) => s + b.grandTotalPaise, 0),
    },
  };

  // Trend: daily buckets up to ~92 days, monthly beyond.
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  const monthly = days > 92;
  const buckets = new Map<string, { label: string; revenue: number; orders: number }>();
  const cursor = startOfDay(from);
  if (monthly) cursor.setDate(1);
  while (cursor <= to) {
    const k = monthly ? monthKey(cursor) : dayKey(cursor);
    const label = monthly
      ? cursor.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      : cursor.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    buckets.set(k, { label, revenue: 0, orders: 0 });
    if (monthly) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  for (const b of inRange) {
    const d = new Date(b.createdAt);
    const e = buckets.get(monthly ? monthKey(d) : dayKey(d));
    if (e) {
      e.revenue += b.grandTotalPaise;
      e.orders += 1;
    }
  }

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h % 12 || 12}${h < 12 ? "a" : "p"}`, orders: 0, revenue: 0 }));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => ({ label, orders: 0, revenue: 0 }));
  const items = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const b of inRange) {
    const d = new Date(b.createdAt);
    hours[d.getHours()].orders++;
    hours[d.getHours()].revenue += b.grandTotalPaise;
    weekdays[d.getDay()].orders++;
    weekdays[d.getDay()].revenue += b.grandTotalPaise;
    for (const l of b.lines) {
      const e = items.get(l.name) ?? { name: l.name, qty: 0, revenue: 0 };
      e.qty += l.qty;
      e.revenue += l.amountPaise;
      items.set(l.name, e);
    }
  }

  return {
    bills: inRange,
    revenue,
    discount,
    tax,
    subTotal,
    itemsSold,
    orders,
    aov,
    split,
    monthly,
    trend: [...buckets.values()],
    hours,
    weekdays,
    topItems: [...items.values()].sort((a, b) => b.revenue - a.revenue),
  };
}

export type Report = ReturnType<typeof buildReport>;
