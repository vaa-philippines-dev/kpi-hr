import type { Rating } from "@/lib/scoring";

/**
 * Single source of truth for rating -> color mapping. Every badge, chart series,
 * and dashboard tile in the app should pull from here rather than hardcoding
 * colors, so the bands stay visually consistent everywhere.
 */
export const RATING_STYLES: Record<
  Rating,
  { badgeClass: string; dotClass: string; chartColor: string }
> = {
  Outstanding: {
    badgeClass:
      "bg-rating-outstanding/15 text-rating-outstanding border-rating-outstanding/30",
    dotClass: "bg-rating-outstanding",
    chartColor: "hsl(var(--rating-outstanding))",
  },
  "Exceeds Expectation": {
    badgeClass: "bg-rating-exceeds/15 text-rating-exceeds border-rating-exceeds/30",
    dotClass: "bg-rating-exceeds",
    chartColor: "hsl(var(--rating-exceeds))",
  },
  "Meets Expectation": {
    badgeClass: "bg-rating-meets/15 text-rating-meets border-rating-meets/30",
    dotClass: "bg-rating-meets",
    chartColor: "hsl(var(--rating-meets))",
  },
  "Needs Improvement": {
    badgeClass:
      "bg-rating-needsImprovement/15 text-rating-needsImprovement border-rating-needsImprovement/30",
    dotClass: "bg-rating-needsImprovement",
    chartColor: "hsl(var(--rating-needs-improvement))",
  },
  Unsatisfactory: {
    badgeClass:
      "bg-rating-unsatisfactory/15 text-rating-unsatisfactory border-rating-unsatisfactory/30",
    dotClass: "bg-rating-unsatisfactory",
    chartColor: "hsl(var(--rating-unsatisfactory))",
  },
};

// Use calculateRating() from "@/lib/scoring" to derive a Rating from a score —
// this file only maps an already-known Rating to its display styling.
