import { describe, expect, it } from "vitest";
import { buildBuckets, findBucketIndex } from "@/lib/date-buckets";

describe("buildBuckets", () => {
  it("creates one bucket per day on daily granularity", () => {
    const buckets = buildBuckets("2026-03-01", "2026-03-05", "daily");

    expect(buckets).toHaveLength(5);
    expect(buckets[0]).toEqual({ start: "2026-03-01", end: "2026-03-01", label: "01/03" });
    expect(buckets[4]).toEqual({ start: "2026-03-05", end: "2026-03-05", label: "05/03" });
  });

  it("closes weekly buckets on Sunday and clips the first and the last week", () => {
    /** 2026-03-04 is a Wednesday, 2026-03-17 is a Tuesday. */
    const buckets = buildBuckets("2026-03-04", "2026-03-17", "weekly");

    expect(buckets).toHaveLength(3);
    expect(buckets[0]).toMatchObject({ start: "2026-03-04", end: "2026-03-08" });
    expect(buckets[1]).toMatchObject({ start: "2026-03-09", end: "2026-03-15" });
    expect(buckets[2]).toMatchObject({ start: "2026-03-16", end: "2026-03-17" });
  });

  it("closes monthly buckets on the last day of the month and clips the range", () => {
    const buckets = buildBuckets("2026-01-20", "2026-03-10", "monthly");

    expect(buckets).toHaveLength(3);
    expect(buckets[0]).toEqual({ start: "2026-01-20", end: "2026-01-31", label: "jan/26" });
    expect(buckets[1]).toEqual({ start: "2026-02-01", end: "2026-02-28", label: "fev/26" });
    expect(buckets[2]).toEqual({ start: "2026-03-01", end: "2026-03-10", label: "mar/26" });
  });

  it("covers a leap February", () => {
    const buckets = buildBuckets("2028-02-01", "2028-02-29", "monthly");

    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ start: "2028-02-01", end: "2028-02-29" });
  });

  it("returns no bucket for an inverted or invalid range", () => {
    expect(buildBuckets("2026-03-10", "2026-03-01", "daily")).toEqual([]);
    expect(buildBuckets("nao-e-data", "2026-03-01", "daily")).toEqual([]);
  });
});

describe("findBucketIndex", () => {
  const buckets = buildBuckets("2026-03-01", "2026-03-31", "weekly");

  it("finds the bucket that contains the instant", () => {
    expect(findBucketIndex(buckets, "2026-03-01T23:59:00.000Z")).toBe(0);
    expect(findBucketIndex(buckets, "2026-03-02T00:00:00.000Z")).toBe(1);
    expect(findBucketIndex(buckets, "2026-03-31T18:00:00.000Z")).toBe(buckets.length - 1);
  });

  it("returns -1 outside the range or without a date", () => {
    expect(findBucketIndex(buckets, "2026-02-28T10:00:00.000Z")).toBe(-1);
    expect(findBucketIndex(buckets, "2026-04-01T00:00:00.000Z")).toBe(-1);
    expect(findBucketIndex(buckets, null)).toBe(-1);
    expect(findBucketIndex(buckets, "nao-e-data")).toBe(-1);
  });
});
