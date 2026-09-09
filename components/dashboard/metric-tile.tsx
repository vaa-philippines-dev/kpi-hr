import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricTile({
  label,
  value,
  subtext,
  className,
}: {
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export function ScoreTile({
  label,
  score,
  rating,
  ratingBadgeClass,
}: {
  label: string;
  score: number;
  rating: string;
  ratingBadgeClass: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">{score.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/ 5.00</span>
        </div>
        <span
          className={cn(
            "mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            ratingBadgeClass
          )}
        >
          {rating}
        </span>
      </CardContent>
    </Card>
  );
}
