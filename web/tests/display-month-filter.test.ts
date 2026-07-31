import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the hook's context dependencies BEFORE importing it.
const mockFilters = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ shortcuts: [] }),
}));
vi.mock("@/contexts/MemoFilterContext", async () => {
  const actual = await vi.importActual<typeof import("@/contexts/MemoFilterContext")>("@/contexts/MemoFilterContext");
  return {
    ...actual,
    useMemoFilterContext: () => ({ filters: mockFilters(), shortcut: undefined }),
  };
});

import { parseMonthFilterRange, useMemoFilters } from "@/hooks/useMemoFilters";

describe("parseMonthFilterRange", () => {
  it("returns correct local-time second boundaries for 2026-05", () => {
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

  it("returns whole seconds", () => {
    const range = parseMonthFilterRange("2026-05")!;
    expect(Number.isInteger(range.start)).toBe(true);
    expect(Number.isInteger(range.end)).toBe(true);
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

describe("useMemoFilters with a displayMonth filter", () => {
  it("emits a timestamp() range covering the local month", () => {
    mockFilters.mockReturnValue([{ factor: "displayMonth", value: "2026-05" }]);
    const { result } = renderHook(() => useMemoFilters());

    const range = parseMonthFilterRange("2026-05")!;
    expect(result.current).toBe(`created_ts >= timestamp(${range.start}) && created_ts < timestamp(${range.end})`);
  });

  it("wraps the epoch seconds in timestamp() — bare integers no longer type-check under CEL", () => {
    mockFilters.mockReturnValue([{ factor: "displayMonth", value: "2026-05" }]);
    const { result } = renderHook(() => useMemoFilters());

    expect(result.current).not.toMatch(/created_ts\s*[<>=]+\s*\d/);
  });

  it("emits no condition for a malformed month value", () => {
    mockFilters.mockReturnValue([{ factor: "displayMonth", value: "2026-13" }]);
    const { result } = renderHook(() => useMemoFilters());

    expect(result.current).toBeUndefined();
  });

  it("combines with other filters", () => {
    mockFilters.mockReturnValue([
      { factor: "tagSearch", value: "diary" },
      { factor: "displayMonth", value: "2026-05" },
    ]);
    const { result } = renderHook(() => useMemoFilters());

    const range = parseMonthFilterRange("2026-05")!;
    expect(result.current).toBe(`tag in ["diary"] && created_ts >= timestamp(${range.start}) && created_ts < timestamp(${range.end})`);
  });
});
