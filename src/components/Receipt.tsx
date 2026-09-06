import { formatMoney } from "@/lib/money";
import type { Bill, Business } from "@/lib/types";

export function Receipt({ bill, business }: { bill: Bill; business: Business }) {
  const cur = business.currencySymbol || "₹";
  const totalQty = bill.lines.reduce((s, l) => s + l.qty, 0);
  const created = new Date(bill.createdAt);

  return (
    <div className="receipt mx-auto shadow-sm">
      <div className="text-center">
        <div className="text-[18px] font-bold uppercase leading-tight">{business.name}</div>
        {business.address
          ? business.address.split("\n").map((line, i) => <div key={i}>{line}</div>)
          : null}
        {business.phone ? <div>Ph: {business.phone}</div> : null}
        {business.fssai ? <div>FSSAI: {business.fssai}</div> : null}
      </div>

      <hr className="receipt-divider" />

      <div className="flex justify-between">
        <span>Bill: {bill.billNumber}</span>
        <span>Token: {bill.tokenNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>{created.toLocaleDateString("en-IN")}</span>
        <span>{created.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="flex justify-between">
        <span>{bill.orderType === "dine_in" ? "Dine In" : "Takeaway"}</span>
        {bill.cashierName ? <span>Cashier: {bill.cashierName}</span> : null}
      </div>
      {bill.customerName ? <div>Customer: {bill.customerName}</div> : null}

      <hr className="receipt-divider" />

      <table className="w-full table-fixed">
        <thead>
          <tr className="text-left">
            <th className="w-[46%] font-bold">Item</th>
            <th className="w-[12%] text-right font-bold">Qty</th>
            <th className="w-[20%] text-right font-bold">Price</th>
            <th className="w-[22%] text-right font-bold">Amt</th>
          </tr>
        </thead>
        <tbody>
          {bill.lines.map((l, i) => (
            <tr key={i} className="align-top">
              <td className="break-words pr-1">{l.name}</td>
              <td className="text-right">{l.qty}</td>
              <td className="text-right">{formatMoney(l.unitPricePaise, "")}</td>
              <td className="text-right">{formatMoney(l.amountPaise, "")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="receipt-divider" />

      <div className="flex justify-between">
        <span>Total Qty</span>
        <span>{totalQty}</span>
      </div>
      <div className="flex justify-between">
        <span>Sub Total</span>
        <span>{formatMoney(bill.subTotalPaise, cur)}</span>
      </div>
      {bill.discountPaise > 0 ? (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{formatMoney(bill.discountPaise, cur)}</span>
        </div>
      ) : null}
      {bill.taxLines.map((t, i) => (
        <div key={i} className="flex justify-between">
          <span>
            {t.name} ({t.percent}%)
          </span>
          <span>{formatMoney(t.amountPaise, cur)}</span>
        </div>
      ))}

      <hr className="receipt-divider" />

      <div className="flex justify-between text-[16px] font-bold">
        <span>GRAND TOTAL</span>
        <span>{formatMoney(bill.grandTotalPaise, cur)}</span>
      </div>

      <hr className="receipt-divider" />

      {business.footerText ? (
        <div className="text-center">{business.footerText}</div>
      ) : null}
    </div>
  );
}
