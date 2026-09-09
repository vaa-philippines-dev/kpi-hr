import { Badge } from "@/components/ui/badge";
import { RATING_STYLES } from "@/lib/ratings";
import type { Rating } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function RatingBadge({ rating, className }: { rating: Rating; className?: string }) {
  const style = RATING_STYLES[rating];
  return (
    <Badge variant="outline" className={cn(style.badgeClass, className)}>
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", style.dotClass)} />
      {rating}
    </Badge>
  );
}
