import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { Business, NumberingConfig } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Business Settings · Aadesh POS" },
      {
        name: "description",
        content:
          "Set up your café details, GST tax components and bill & token numbering for Aadesh billing.",
      },
      { property: "og:title", content: "Business Settings · Aadesh POS" },
      {
        property: "og:description",
        content: "Configure business details, taxes and numbering for your Aadesh receipts.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { ready, business, saveBusiness, menu, setMenu, bills, setBills } = useStore();
  const [form, setForm] = useState<Business>(business);
  const fileRef = useRef<HTMLInputElement>(null);

  function onBackup() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, savedAt: new Date().toISOString(), business, menu, bills }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aadesh-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup file saved");
  }

  async function onRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || !data.business) throw new Error("bad file");
      saveBusiness({ ...business, ...data.business });
      setMenu(Array.isArray(data.menu) ? data.menu : []);
      setBills(Array.isArray(data.bills) ? data.bills : []);
      toast.success("Backup restored");
    } catch {
      toast.error("That file could not be read");
    }
  }

  useEffect(() => {
    if (ready) setForm(business);
  }, [ready, business]);

  const set = <K extends keyof Business>(key: K, value: Business[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setNumbering = (
    key: "billNumbering" | "tokenNumbering",
    patch: Partial<NumberingConfig>,
  ) => setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  function onSave() {
    if (!form.name.trim()) {
      toast.error("Business name is required");
      return;
    }
    saveBusiness({
      ...form,
      name: form.name.trim(),
      currencySymbol: form.currencySymbol.trim() || "₹",
      taxComponents: form.taxComponents.map((t) => ({ ...t, name: t.name.trim() })),
    });
    toast.success("Settings saved");
  }

  return (
    <AppShell
      title="Business settings"
      description="These details print at the top of every receipt."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business name</Label>
              <Input
                id="name"
                value={form.name}
                maxLength={80}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                maxLength={300}
                placeholder={"Shop 12, MG Road\nPune 411001"}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  maxLength={20}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fssai">FSSAI number</Label>
                <Input
                  id="fssai"
                  maxLength={30}
                  value={form.fssai}
                  onChange={(e) => set("fssai", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="footer">Receipt footer text</Label>
                <Input
                  id="footer"
                  maxLength={120}
                  value={form.footerText}
                  onChange={(e) => set("footerText", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  maxLength={3}
                  value={form.currencySymbol}
                  onChange={(e) => set("currencySymbol", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Tax</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="tax" className="text-sm text-muted-foreground">
                  Apply tax
                </Label>
                <Switch
                  id="tax"
                  checked={form.taxEnabled}
                  onCheckedChange={(v) => set("taxEnabled", v)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.taxComponents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tax components yet. Add e.g. CGST 2.5% and SGST 2.5%.
                </p>
              ) : null}
              {form.taxComponents.map((tc, i) => (
                <div key={tc.id} className="flex items-center gap-2">
                  <Input
                    aria-label="Tax name"
                    className="flex-1"
                    maxLength={30}
                    value={tc.name}
                    onChange={(e) => {
                      const next = [...form.taxComponents];
                      next[i] = { ...tc, name: e.target.value };
                      set("taxComponents", next);
                    }}
                  />
                  <div className="flex w-28 items-center gap-1">
                    <Input
                      aria-label="Tax percent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={tc.percent}
                      onChange={(e) => {
                        const next = [...form.taxComponents];
                        next[i] = { ...tc, percent: Number(e.target.value) || 0 };
                        set("taxComponents", next);
                      }}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${tc.name || "tax component"}`}
                    onClick={() =>
                      set(
                        "taxComponents",
                        form.taxComponents.filter((x) => x.id !== tc.id),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  set("taxComponents", [
                    ...form.taxComponents,
                    { id: crypto.randomUUID(), name: "", percent: 2.5 },
                  ])
                }
              >
                <Plus className="size-4" /> Add tax component
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Numbering</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <NumberingFields
                label="Bill number"
                config={form.billNumbering}
                onChange={(p) => setNumbering("billNumbering", p)}
              />
              <NumberingFields
                label="Token number"
                config={form.tokenNumbering}
                onChange={(p) => setNumbering("tokenNumbering", p)}
              />
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Bill and token numbers are separate counters and can be configured
                independently.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={onSave}>
          Save settings
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Backup &amp; restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All your business details, menu and bills are saved on this computer inside
            this browser — nothing is sent anywhere. Save a backup file regularly (for
            example to a pen drive) so you can restore everything if the computer or
            browser is reset.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={onBackup}>
              <Download className="size-4" /> Save backup file
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Restore from file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onRestore}
            />
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function NumberingFields({
  label,
  config,
  onChange,
}: {
  label: string;
  config: NumberingConfig;
  onChange: (patch: Partial<NumberingConfig>) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold">{label}</p>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Prefix</Label>
        <Input
          maxLength={8}
          placeholder="e.g. INV-"
          value={config.prefix}
          onChange={(e) => onChange({ prefix: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Next number</Label>
        <Input
          type="number"
          min="1"
          value={config.next}
          onChange={(e) => onChange({ next: Math.max(1, Number(e.target.value) || 1) })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Reset daily</Label>
        <Switch
          checked={config.resetDaily}
          onCheckedChange={(v) => onChange({ resetDaily: v })}
        />
      </div>
    </div>
  );
}
