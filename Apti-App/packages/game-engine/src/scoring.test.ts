import { describe, expect, it } from "vitest";
import {
  effectiveResponseTime,
  isAnswerOnTime,
  medianRoundTrip,
  scoreAnswer,
  type TimingPolicy,
} from "./scoring.js";

const policy: TimingPolicy = { durationMs: 30_000, maxCompensationMs: 100, bucketMs: 100 };
const startsAt = 1_000_000;
const endsAt = startsAt + policy.durationMs;

describe("isAnswerOnTime", () => {
  it("accepts an Answer received exactly at the deadline", () => {
    expect(isAnswerOnTime({ startsAt, endsAt }, endsAt)).toBe(true);
  });

  it("rejects an Answer received one millisecond after the deadline", () => {
    expect(isAnswerOnTime({ startsAt, endsAt }, endsAt + 1)).toBe(false);
  });

  it("rejects an Answer received before the Round opened", () => {
    expect(isAnswerOnTime({ startsAt, endsAt }, startsAt - 1)).toBe(false);
  });
});

describe("medianRoundTrip", () => {
  it("has no median without a valid sample", () => {
    expect(medianRoundTrip([])).toBeNull();
    expect(medianRoundTrip([Number.NaN, -5, Number.POSITIVE_INFINITY])).toBeNull();
  });

  it("takes the middle sample of an odd window and averages an even one", () => {
    expect(medianRoundTrip([300, 40, 80])).toBe(80);
    expect(medianRoundTrip([40, 80, 120, 1_000])).toBe(100);
  });
});

describe("effectiveResponseTime", () => {
  it("subtracts nothing when there is no delay sample", () => {
    expect(
      effectiveResponseTime(policy, { startsAt, receivedAt: startsAt + 1_250, medianRttMs: null }),
    ).toBe(1_200);
  });

  it("subtracts half the median round trip", () => {
    expect(
      effectiveResponseTime(policy, { startsAt, receivedAt: startsAt + 1_250, medianRttMs: 120 }),
    ).toBe(1_100);
  });

  it("caps the compensation at the policy maximum", () => {
    expect(
      effectiveResponseTime(policy, { startsAt, receivedAt: startsAt + 1_250, medianRttMs: 2_000 }),
    ).toBe(1_100);
  });

  it("floors to the scoring bucket so close Answers share a score", () => {
    expect(
      effectiveResponseTime(policy, { startsAt, receivedAt: startsAt + 1_299, medianRttMs: null }),
    ).toBe(1_200);
    expect(
      effectiveResponseTime(policy, { startsAt, receivedAt: startsAt + 1_200, medianRttMs: null }),
    ).toBe(1_200);
  });

  it("clamps to the Round duration and never below zero", () => {
    expect(
      effectiveResponseTime(policy, { startsAt, receivedAt: startsAt + 40, medianRttMs: 400 }),
    ).toBe(0);
    expect(
      effectiveResponseTime(policy, { startsAt, receivedAt: endsAt + 500, medianRttMs: null }),
    ).toBe(30_000);
  });
});

describe("scoreAnswer", () => {
  it("rewards faster correct Answers between 500 and 1000 points", () => {
    expect(scoreAnswer(policy, { correct: true, effectiveResponseMs: 0 })).toBe(1_000);
    expect(scoreAnswer(policy, { correct: true, effectiveResponseMs: 15_000 })).toBe(750);
    expect(scoreAnswer(policy, { correct: true, effectiveResponseMs: 30_000 })).toBe(500);
  });

  it("gives a wrong Answer zero points", () => {
    expect(scoreAnswer(policy, { correct: false, effectiveResponseMs: 0 })).toBe(0);
  });
});
