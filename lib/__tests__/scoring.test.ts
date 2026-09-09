import { describe, expect, it } from "vitest";
import {
  calculateAchievement,
  calculateKpiResult,
  calculateRating,
  calculateScore,
  calculateWeightedScore,
} from "../scoring";

describe("calculateAchievement", () => {
  it("computes actual/target for HIGHER_IS_BETTER", () => {
    expect(calculateAchievement(120, 100, "HIGHER_IS_BETTER")).toBeCloseTo(1.2);
  });

  it("inverts to target/actual for LOWER_IS_BETTER", () => {
    expect(calculateAchievement(20, 30, "LOWER_IS_BETTER")).toBeCloseTo(1.5);
  });

  it("treats a zero target as fully met", () => {
    expect(calculateAchievement(0, 0, "HIGHER_IS_BETTER")).toBe(1);
  });
});

describe("calculateScore", () => {
  it("scores exactly-on-target as 3.00", () => {
    expect(calculateScore(1)).toBeCloseTo(3.0);
  });

  it("scores 120% achievement as 3.60", () => {
    expect(calculateScore(1.2)).toBeCloseTo(3.6);
  });

  it("caps above 5.00", () => {
    expect(calculateScore(3)).toBe(5.0);
  });

  it("caps below 1.00", () => {
    expect(calculateScore(0)).toBe(1.0);
  });
});

describe("calculateRating", () => {
  it.each([
    [5.0, "Outstanding"],
    [4.5, "Outstanding"],
    [4.49, "Exceeds Expectation"],
    [4.0, "Exceeds Expectation"],
    [3.99, "Meets Expectation"],
    [3.0, "Meets Expectation"],
    [2.99, "Needs Improvement"],
    [2.0, "Needs Improvement"],
    [1.99, "Unsatisfactory"],
    [1.0, "Unsatisfactory"],
  ] as const)("rates %f as %s", (score, rating) => {
    expect(calculateRating(score)).toBe(rating);
  });
});

describe("calculateWeightedScore", () => {
  it("multiplies score by weight", () => {
    expect(calculateWeightedScore(4.0, 25)).toBe(100);
  });
});

describe("calculateKpiResult (end to end)", () => {
  it("matches the worked example: target 10 hires, actual 12, weight 25", () => {
    const result = calculateKpiResult({
      actual: 12,
      target: 10,
      weight: 25,
      direction: "HIGHER_IS_BETTER",
    });
    expect(result.achievement).toBeCloseTo(1.2);
    expect(result.score).toBeCloseTo(3.6);
    expect(result.rating).toBe("Meets Expectation");
    expect(result.weightedScore).toBeCloseTo(90);
  });

  it("rewards beating a days-to-fill (LOWER_IS_BETTER) target", () => {
    const result = calculateKpiResult({
      actual: 20, // days — fewer is better
      target: 30,
      weight: 20,
      direction: "LOWER_IS_BETTER",
    });
    expect(result.achievement).toBeCloseTo(1.5);
    expect(result.score).toBeCloseTo(4.5);
    expect(result.rating).toBe("Outstanding");
  });

  it("penalizes missing a days-to-fill target", () => {
    const result = calculateKpiResult({
      actual: 45,
      target: 30,
      weight: 20,
      direction: "LOWER_IS_BETTER",
    });
    expect(result.achievement).toBeCloseTo(30 / 45);
    expect(result.score).toBeLessThan(3);
    expect(result.rating).toBe("Needs Improvement");
  });
});
