import { ORDER_STATUS_COLORS, orderStatusLabel, type OrderStatus } from "@/lib/corporate/orders";

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${ORDER_STATUS_COLORS[status as OrderStatus] ?? "bg-slate-100"}`}>
      {orderStatusLabel(status)}
    </span>
  );
}
