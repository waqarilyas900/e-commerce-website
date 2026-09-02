import { formatPkr } from "@/app/lib/format-currency";

type Props = {
  savingsPkr: number;
  className?: string;
};

/** Total compare-at savings for cart / checkout summaries. */
export function CartSavingsRow({ savingsPkr, className = "" }: Props) {
  if (savingsPkr <= 0) return null;
  return (
    <div
      className={`flex items-center justify-between gap-3 text-sm font-medium text-emerald-800 ${className}`.trim()}
      role="status"
    >
      <span>You saved</span>
      <span className="tabular-nums">{formatPkr(savingsPkr)}</span>
    </div>
  );
}
