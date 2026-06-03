import { describe, expect, it } from "vitest";
import { parseMonthFilterRange } from "@/hooks/useMemoFilters";

describe("parseMonthFilterRange", () => {
  it("returns correct UTC second boundaries for 2026-05", () => {
    const range = parseMonthFilterRange("2026-05");
    expect(range).toBeDefined();
    const start = new Date(range!.start * 1000);
    const end = new Date(range!.end * 1000);
    // start must be local 2026-05-01 00:00:00
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4); // May (0-indexed)
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    // end must be local 2026-06-01 00:00:00
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(5); // June
    expect(end.getDate()).toBe(1);
    expect(end.getHours()).toBe(0);
    expect(end.getMinutes()).toBe(0);
    expect(end.getSeconds()).toBe(0);
  });

  it("handles December correctly (rolls into next year)", () => {
    const range = parseMonthFilterRange("2025-12");
    expect(range).toBeDefined();
    const end = new Date(range!.end * 1000);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(0); // January
    expect(end.getDate()).toBe(1);
  });

  it("returns undefined for empty string", () => {
    expect(parseMonthFilterRange("")).toBeUndefined();
  });

  it("returns undefined for single-digit month (2026-5)", () => {
    expect(parseMonthFilterRange("2026-5")).toBeUndefined();
  });

  it("returns undefined for month 00", () => {
    expect(parseMonthFilterRange("2026-00")).toBeUndefined();
  });

  it("returns undefined for month 13", () => {
    expect(parseMonthFilterRange("2026-13")).toBeUndefined();
  });

  it("returns undefined for non-month strings", () => {
    expect(parseMonthFilterRange("not-a-month")).toBeUndefined();
    expect(parseMonthFilterRange("2026-05-12")).toBeUndefined();
    expect(parseMonthFilterRange("2026")).toBeUndefined();
  });
});
