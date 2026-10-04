import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-3.5",
  default: "size-4",
  lg: "size-5",
} as const;

export function RatingStars({
  value,
  count,
  size = "sm",
  showValue = true,
  className,
}: {
  value: number;
  count?: number;
  size?: keyof typeof SIZES;
  showValue?: boolean;
  className?: string;
}) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <span className={cn("text-accent inline-flex items-center gap-0.5", className)}>
      {stars.map((s) => {
        const fill = Math.max(0, Math.min(1, value - s + 1));
        return (
          <span key={s} className="relative inline-flex">
            <Star className={cn(SIZES[size], "text-border")} aria-hidden="true" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className={cn(SIZES[size], "fill-accent text-accent")}
                aria-hidden="true"
              />
            </span>
          </span>
        );
      })}
      {showValue && (
        <span className="text-muted-foreground ml-1 text-xs font-medium">
          {value > 0 ? value.toFixed(1) : "N/A"}
          {count != null && <span> ({count})</span>}
        </span>
      )}
    </span>
  );
}
