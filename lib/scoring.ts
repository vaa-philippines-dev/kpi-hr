/**
 * The KPI scoring engine. Pure functions only — no I/O, no Prisma, no dates beyond
 * what's passed in. Every KPI percentage in this system must be produced by
 * calculateKpiResult(), never typed in by a user. See CLAUDE.md for the full
 * business-logic writeup this file implements.
 */

export type Direction = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

export type Rating =
  | "Outstanding"
  | "Exceeds Expectation"
  | "Meets Expectation"
  | "Needs Improvement"
  | "Unsatisfactory";

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;
export const SCORE_MIDPOINT = 3;

/** Rating bands, evaluated high-to-low. Fixed — do not change without sign-off. */
export const RATING_BANDS: { min: number; max: number; rating: Rating }[] = [
  { min: 4.5, max: 5.0, rating: "Outstanding" },
  { min: 4.0, max: 4.49, rating: "Exceeds Expectation" },
  { min: 3.0, max: 3.99, rating: "Meets Expectation" },
  { min: 2.0, max: 2.99, rating: "Needs Improvement" },
  { min: 1.0, max: 1.99, rating: "Unsatisfactory" },
];

/**
 * Upper bound on a returned achievement value. Score/rating already saturate
 * (see calculateScore) long before achievement reaches this — it exists purely
 * so an extreme ratio (e.g. a LOWER_IS_BETTER KPI with actual = 0) never comes
 * out as Infinity/NaN, which KPIResult.achievement (Decimal(6,4)) can't store.
 */
export const MAX_ACHIEVEMENT = 99;

/**
 * Achievement = Actual / Target, inverted for LOWER_IS_BETTER KPIs
 * (Achievement = Target / Actual) so a smaller actual still yields >1.
 */
export function calculateAchievement(
  actual: number,
  target: number,
  direction: Direction
): number {
  if (target === 0) {
    // A zero target has no meaningful ratio; treat as fully met to avoid
    // divide-by-zero blowing up the dashboard for a not-yet-configured KPI.
    return actual === 0 ? 1 : direction === "LOWER_IS_BETTER" ? 1 : 0;
  }
  const raw =
    direction === "LOWER_IS_BETTER"
      ? actual === 0
        ? MAX_ACHIEVEMENT
        : target / actual
      : actual / target;
  if (!Number.isFinite(raw)) return MAX_ACHIEVEMENT;
  return Math.max(0, Math.min(raw, MAX_ACHIEVEMENT));
}

/** Score = 3 + ((Achievement - 1) x 3), capped to [1.00, 5.00]. */
export function calculateScore(achievement: number): number {
  const raw = SCORE_MIDPOINT + (achievement - 1) * 3;
  return clamp(raw, SCORE_MIN, SCORE_MAX);
}

export function calculateRating(score: number): Rating {
  const clamped = clamp(score, SCORE_MIN, SCORE_MAX);
  const band = RATING_BANDS.find((b) => clamped >= b.min && clamped <= b.max);
  // clamp() guarantees score falls in [1, 5], which the bands cover exhaustively.
  return band!.rating;
}

export function calculateWeightedScore(score: number, weight: number): number {
  return score * weight;
}

export interface KpiResultInput {
  actual: number;
  target: number;
  weight: number;
  direction: Direction;
}

export interface KpiResultOutput {
  actual: number;
  target: number;
  achievement: number;
  score: number;
  rating: Rating;
  weight: number;
  weightedScore: number;
}

/** The single entry point the rest of the app should call to turn a
 * (target, actual, weight, direction) tuple into a full scored result. */
export function calculateKpiResult(input: KpiResultInput): KpiResultOutput {
  const achievement = calculateAchievement(input.actual, input.target, input.direction);
  const score = calculateScore(achievement);
  const rating = calculateRating(score);
  const weightedScore = calculateWeightedScore(score, input.weight);
  return {
    actual: input.actual,
    target: input.target,
    achievement,
    score,
    rating,
    weight: input.weight,
    weightedScore,
  };
}

export function sumWeightedScores(scores: { weightedScore: number }[]): number {
  return scores.reduce((sum, s) => sum + s.weightedScore, 0);
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
