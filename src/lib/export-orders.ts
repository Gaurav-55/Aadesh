import * as XLSX from "xlsx";

import { paiseToRupeeString } from "./money";
import type { Bill } from "./types";

const typeLabel = { dine_in: "Dine In", takeaway: "Takeaway" } as const;

/** Downloads all bills as an .xlsx workbook (Orders + Line items sheets). */
export function exportOrdersToExcel(bills: Bill[], businessName: string) {
  const orders = bills.map((b) => ({
    "Bill No": b.billNumber,
    Token: b.tokenNumber,
    "Date & Time": new Date(b.createdAt).toLocaleString("en-IN"),
    "Order Type": typeLabel[b.orderType],
    Customer: b.customerName,
    Cashier: b.cashierName,
    Items: b.lines.map((l) => `${l.name} x${l.qty}`).join(", "),
    "Total Qty": b.lines.reduce((s, l) => s + l.qty, 0),
    "Sub Total": Number(paiseToRupeeString(b.subTotalPaise)),
    Discount: Number(paiseToRupeeString(b.discountPaise)),
    Tax: Number(paiseToRupeeString(b.taxPaise)),
    "Grand Total": Number(paiseToRupeeString(b.grandTotalPaise)),
    Status: b.status,
  }));

  const lines = bills.flatMap((b) =>
    b.lines.map((l) => ({
      "Bill No": b.billNumber,
      "Date & Time": new Date(b.createdAt).toLocaleString("en-IN"),
      Item: l.name,
      Qty: l.qty,
      "Unit Price": Number(paiseToRupeeString(l.unitPricePaise)),
      Amount: Number(paiseToRupeeString(l.amountPaise)),
    })),
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders), "Orders");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lines), "Line items");

  const stamp = new Date().toISOString().slice(0, 10);
  const safe = (businessName || "Aadesh").replace(/[^a-z0-9]+/gi, "-");
  XLSX.writeFile(wb, `${safe}-orders-${stamp}.xlsx`);
}
