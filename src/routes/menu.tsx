import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, paiseToRupeeString, rupeesToPaise } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { MenuItem, MenuItemOption } from "@/lib/types";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu Management · Aadesh POS" },
      {
        name: "description",
        content:
          "Add, edit and remove menu items and their size or variant options with prices in Aadesh café billing.",
      },
      { property: "og:title", content: "Menu Management · Aadesh POS" },
      {
        property: "og:description",
        content: "Manage your café menu items, variants and prices for fast billing.",
      },
    ],
  }),
  component: MenuPage,
});

type Draft = {
  id: string | null;
  name: string;
  category: string;
  price: string;
  options: { id: string; name: string; price: string }[];
};

const UNCATEGORISED = "Uncategorised";

const emptyDraft = (): Draft => ({
  id: null,
  name: "",
  category: "",
  price: "",
  options: [],
});

function toDraft(item: MenuItem): Draft {
  return {
    id: item.id,
    name: item.name,
    category: item.category ?? "",
    price: paiseToRupeeString(item.pricePaise),
    options: item.options.map((o) => ({
      id: o.id,
      name: o.name,
      price: paiseToRupeeString(o.pricePaise),
    })),
  };
}

function MenuPage() {
  const { ready, business, menu, setMenu } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((i) => set.add(i.category?.trim() || UNCATEGORISED));
    return [...set].sort((a, b) =>
      a === UNCATEGORISED ? 1 : b === UNCATEGORISED ? -1 : a.localeCompare(b),
    );
  }, [menu]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...menu].sort((a, b) => a.name.localeCompare(b.name));
    return sorted
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .filter((i) =>
        activeCategory === "all"
          ? true
          : (i.category?.trim() || UNCATEGORISED) === activeCategory,
      );
  }, [menu, query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    filtered.forEach((i) => {
      const key = i.category?.trim() || UNCATEGORISED;
      map.set(key, [...(map.get(key) ?? []), i]);
    });
    return [...map.entries()].sort(([a], [b]) =>
      a === UNCATEGORISED ? 1 : b === UNCATEGORISED ? -1 : a.localeCompare(b),
    );
  }, [filtered]);

  function openNew() {
    setDraft(emptyDraft());
    setOpen(true);
  }

  function openEdit(item: MenuItem) {
    setDraft(toDraft(item));
    setOpen(true);
  }

  function save() {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Item name is required");
      return;
    }
    const options: MenuItemOption[] = draft.options
      .filter((o) => o.name.trim())
      .map((o) => ({
        id: o.id,
        name: o.name.trim(),
        pricePaise: rupeesToPaise(o.price),
      }));

    const item: MenuItem = {
      id: draft.id ?? crypto.randomUUID(),
      name,
      category: draft.category.trim(),
      pricePaise: rupeesToPaise(draft.price),
      options,
    };

    setMenu(draft.id ? menu.map((m) => (m.id === draft.id ? item : m)) : [...menu, item]);
    setOpen(false);
    toast.success(draft.id ? "Item updated" : "Item added");
  }

  function remove(item: MenuItem) {
    setMenu(menu.filter((m) => m.id !== item.id));
    toast.success(`Removed ${item.name}`);
  }

  const currency = ready ? business.currencySymbol : "₹";

  return (
    <AppShell
      title="Menu"
      description="Items and their variants. Prices here fill in automatically while billing."
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search items"
            aria-label="Search menu items"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add item
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeCategory === "all" ? "default" : "outline"}
            onClick={() => setActiveCategory("all")}
          >
            All items
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={activeCategory === c ? "default" : "outline"}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      ) : null}


      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary">
              <UtensilsCrossed className="size-5 text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">
              {menu.length === 0
                ? "No menu items yet. Add your first one — e.g. Masala Chai ₹20."
                : "No items match that search."}
            </p>
            {menu.length === 0 ? (
              <Button variant="secondary" onClick={openNew}>
                <Plus className="size-4" /> Add item
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 font-heading text-lg font-semibold">
                {category}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({items.length})
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="font-mono text-sm text-muted-foreground">
                            {formatMoney(item.pricePaise, currency)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => remove(item)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      {item.options.length > 0 ? (
                        <ul className="space-y-1 border-t border-border pt-2">
                          {item.options.map((o) => (
                            <li key={o.id} className="flex justify-between text-sm">
                              <span className="truncate text-muted-foreground">
                                {o.name}
                              </span>
                              <span className="font-mono">
                                {formatMoney(o.pricePaise, currency)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item name</Label>
              <Input
                id="item-name"
                maxLength={60}
                placeholder="Masala Chai"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Input
                id="item-category"
                list="menu-categories"
                maxLength={40}
                placeholder="Beverages"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              />
              <datalist id="menu-categories">
                {categories
                  .filter((c) => c !== UNCATEGORISED)
                  .map((c) => (
                    <option key={c} value={c} />
                  ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the item under {UNCATEGORISED}.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Price ({currency})</Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="20"
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">Options / variants</p>
              {draft.options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Optional — e.g. Half ₹15, Full ₹25. Each option has its own price.
                </p>
              ) : null}
              {draft.options.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <Input
                    aria-label="Option name"
                    className="flex-1"
                    maxLength={40}
                    placeholder="Full"
                    value={o.name}
                    onChange={(e) =>
                      setDraft((d) => {
                        const options = [...d.options];
                        options[i] = { ...o, name: e.target.value };
                        return { ...d, options };
                      })
                    }
                  />
                  <Input
                    aria-label="Option price"
                    className="w-28"
                    type="number"
                    min="0"
                    step="0.01"
                    value={o.price}
                    onChange={(e) =>
                      setDraft((d) => {
                        const options = [...d.options];
                        options[i] = { ...o, price: e.target.value };
                        return { ...d, options };
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove option ${o.name || i + 1}`}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        options: d.options.filter((x) => x.id !== o.id),
                      }))
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
                  setDraft((d) => ({
                    ...d,
                    options: [
                      ...d.options,
                      { id: crypto.randomUUID(), name: "", price: d.price },
                    ],
                  }))
                }
              >
                <Plus className="size-4" /> Add option
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{draft.id ? "Save changes" : "Add item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
