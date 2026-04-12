import { formatOrderStatusLabel } from "@/app/lib/orders-display";

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    ring: "ring-amber-200/80",
  },
  confirmed: {
    bg: "bg-sky-50",
    text: "text-sky-900",
    ring: "ring-sky-200/80",
  },
  paid: {
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    ring: "ring-emerald-200/80",
  },
  processing: {
    bg: "bg-violet-50",
    text: "text-violet-900",
    ring: "ring-violet-200/80",
  },
  shipped: {
    bg: "bg-teal-50",
    text: "text-teal-900",
    ring: "ring-teal-200/80",
  },
  delivered: {
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    ring: "ring-emerald-200/80",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-900",
    ring: "ring-red-200/80",
  },
  refunded: {
    bg: "bg-neutral-100",
    text: "text-neutral-800",
    ring: "ring-neutral-200/80",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-neutral-100",
  text: "text-neutral-800",
  ring: "ring-neutral-200/80",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
    >
      {formatOrderStatusLabel(status)}
    </span>
  );
}
