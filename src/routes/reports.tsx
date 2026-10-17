import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { buildReport, rangeFor, type RangeKey } from "@/lib/reports";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Sales Reports — Aadesh" },
      { name: "description", content: "Sales charts, top items, peak hours and revenue reports for your café." },
      { property: "og:title", content: "Sales Reports — Aadesh" },
      { property: "og:description", content: "Revenue trends, best sellers and busiest hours at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

const presets: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "1m", label: "1 Month" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "custom", label: "Custom" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

function Reports() {
  const { business, bills } = useStore();
  const cur = business.currencySymbol || "₹";
  const [range, setRange] = useState<RangeKey>("1m");
  const [custom, setCustom] = useState(() => {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - 30);
    return { from: iso(f), to: iso(t) };
  });

  const { from, to } = useMemo(() => rangeFor(range, new Date(), custom), [range, custom]);
  const r = useMemo(() => buildReport(bills, from, to), [bills, from, to]);
  const money = (p: number) => formatMoney(p, cur);
  const rupees = (p: number) => p / 100;
  const busiest = r.hours.reduce((a, b) => (b.orders > a.orders ? b : a), r.hours[0]);
  const bestDay = r.weekdays.reduce((a, b) => (b.revenue > a.revenue ? b : a), r.weekdays[0]);

  function exportReport() {
    const wb = XLSX.utils.book_new();
    const summary = [
      ["Aadesh Sales Report", business.name],
      ["From", from.toLocaleDateString("en-IN")],
      ["To", to.toLocaleDateString("en-IN")],
      [],
      ["Total revenue (₹)", rupees(r.revenue)],
      ["Orders", r.orders],
      ["Average order (₹)", rupees(r.aov)],
      ["Items sold", r.itemsSold],
      ["Sub total (₹)", rupees(r.subTotal)],
      ["Discounts (₹)", rupees(r.discount)],
      ["Tax collected (₹)", rupees(r.tax)],
      ["Dine In orders", r.split.dineIn.orders],
      ["Dine In revenue (₹)", rupees(r.split.dineIn.revenue)],
      ["Takeaway orders", r.split.takeaway.orders],
      ["Takeaway revenue (₹)", rupees(r.split.takeaway.revenue)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(r.trend.map((t) => ({ Period: t.label, Orders: t.orders, "Revenue (₹)": rupees(t.revenue) }))),
      "Trend",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(r.topItems.map((i) => ({ Item: i.name, "Qty sold": i.qty, "Revenue (₹)": rupees(i.revenue) }))),
      "Items",
    );
    XLSX.writeFile(wb, `aadesh-report-${iso(from)}-to-${iso(to)}.xlsx`);
  }

  const kpis = [
    { label: "Total revenue", value: money(r.revenue) },
    { label: "Orders", value: String(r.orders) },
    { label: "Average order", value: money(r.aov) },
    { label: "Items sold", value: String(r.itemsSold) },
    { label: "Discounts given", value: money(r.discount) },
    { label: "Tax collected", value: money(r.tax) },
  ];

  const splitData = [
    { name: "Dine In", value: r.split.dineIn.orders },
    { name: "Takeaway", value: r.split.takeaway.orders },
  ];
  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--foreground)",
  };

  return (
    <AppShell title="Reports" description={`${from.toLocaleDateString("en-IN")} – ${to.toLocaleDateString("en-IN")}`}>
      <div className="mb-6 flex flex-wrap items-end gap-2">
        {presets.map((p) => (
          <Button key={p.key} size="sm" variant={range === p.key ? "default" : "outline"} onClick={() => setRange(p.key)}>
            {p.label}
          </Button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="w-40" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="w-40" />
          </div>
        )}
        <Button size="sm" variant="secondary" className="ml-auto" onClick={exportReport}>
          <FileSpreadsheet className="size-4" /> Export Excel
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-display text-xl font-semibold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {r.orders === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">No bills in this period yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Sales over time ({r.monthly ? "monthly" : "daily"})</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={r.trend.map((t) => ({ ...t, rupees: rupees(t.revenue) }))}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" minTickGap={16} />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => (n === "rupees" ? [`${cur}${v.toFixed(2)}`, "Revenue"] : [v, "Orders"])} />
                  <Area type="monotone" dataKey="rupees" stroke="var(--primary)" fill="url(#rev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Busiest hours · peak {busiest.label}</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.hours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" fontSize={10} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Orders"]} />
                  <Bar dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dine In vs Takeaway</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="75%">
                <PieChart>
                  <Pie data={splitData} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    <Cell fill="var(--primary)" />
                    <Cell fill="var(--accent-foreground)" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around text-sm">
                <div><span className="font-semibold">Dine In</span> · {r.split.dineIn.orders} · {money(r.split.dineIn.revenue)}</div>
              </div>
              <div className="flex justify-around text-sm">
                <div><span className="font-semibold">Takeaway</span> · {r.split.takeaway.orders} · {money(r.split.takeaway.revenue)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales by weekday · best {bestDay.label}</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.weekdays.map((w) => ({ ...w, rupees: rupees(w.revenue) }))}>
                  <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${cur}${v.toFixed(2)}`, "Revenue"]} />
                  <Bar dataKey="rupees" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Top selling items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-1">#</th><th>Item</th><th className="text-right">Qty</th><th className="text-right">Revenue</th><th className="text-right">Share</th></tr>
                  </thead>
                  <tbody>
                    {r.topItems.slice(0, 20).map((i, idx) => (
                      <tr key={i.name} className="border-t border-border">
                        <td className="py-1.5 text-muted-foreground">{idx + 1}</td>
                        <td>{i.name}</td>
                        <td className="text-right">{i.qty}</td>
                        <td className="text-right">{money(i.revenue)}</td>
                        <td className="text-right text-muted-foreground">
                          {r.subTotal ? ((i.revenue / r.subTotal) * 100).toFixed(1) : "0"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
