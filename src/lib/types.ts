export type TaxComponent = {
  id: string;
  name: string;
  percent: number;
};

export type NumberingConfig = {
  prefix: string;
  next: number;
  /** Reset counter each day */
  resetDaily: boolean;
  lastResetDate: string | null;
};

export type Business = {
  name: string;
  address: string;
  phone: string;
  fssai: string;
  footerText: string;
  currencySymbol: string;
  taxEnabled: boolean;
  taxComponents: TaxComponent[];
  billNumbering: NumberingConfig;
  tokenNumbering: NumberingConfig;
  printerName?: string;
  /** Paper roll width preset */
  paperWidth?: "80mm" | "58mm";
  /** Side margin preset on the printed receipt */
  printMargin?: "none" | "small" | "normal";
};

export type MenuItemOption = {
  id: string;
  name: string;
  pricePaise: number;
};

export type MenuItem = {
  id: string;
  name: string;
  /** Optional grouping, e.g. "Beverages". Empty means Uncategorised. */
  category?: string;
  pricePaise: number;
  options: MenuItemOption[];
};

export type BillLine = {
  name: string;
  qty: number;
  unitPricePaise: number;
  amountPaise: number;
};

export type BillTaxLine = {
  name: string;
  percent: number;
  amountPaise: number;
};

export type Bill = {
  id: string;
  customerName: string;
  createdAt: string;
  orderType: "dine_in" | "takeaway";
  cashierName: string;
  billNumber: string;
  tokenNumber: string;
  lines: BillLine[];
  subTotalPaise: number;
  discountPaise: number;
  taxLines: BillTaxLine[];
  taxPaise: number;
  grandTotalPaise: number;
  status: "saved" | "printed" | "print_failed";
};

export const defaultBusiness: Business = {
  name: "My Café",
  address: "",
  phone: "",
  fssai: "",
  footerText: "Thank you! Visit again.",
  currencySymbol: "₹",
  taxEnabled: false,
  taxComponents: [],
  billNumbering: { prefix: "", next: 1, resetDaily: false, lastResetDate: null },
  tokenNumbering: { prefix: "", next: 1, resetDaily: false, lastResetDate: null },
};
