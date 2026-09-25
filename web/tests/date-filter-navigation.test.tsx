import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MemoFilterProvider } from "@/contexts/MemoFilterContext";
import { useDateFilterNavigation } from "@/hooks/useDateFilterNavigation";
import { useMonthFilterNavigation } from "@/hooks/useMonthFilterNavigation";

const Harness = () => {
  const location = useLocation();
  const navigateToDate = useDateFilterNavigation();
  const navigateToMonth = useMonthFilterNavigation();
  return (
    <>
      <button type="button" onClick={() => navigateToMonth("2026-09")}>
        Select month
      </button>
      <output data-testid="search">{location.search}</output>
      <button type="button" onClick={() => navigateToDate("2026-08-02")}>
        Select date
      </button>
    </>
  );
};

describe("useDateFilterNavigation", () => {
  it("preserves unrelated query parameters while replacing the date filter", async () => {
    render(
      <MemoryRouter initialEntries={["/u/steven?sort=displayTime&filter=tagSearch%3Awork%2CdisplayMonth%3A2026-07"]}>
        <MemoFilterProvider>
          <Harness />
        </MemoFilterProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select date" }));

    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId("search").textContent ?? "");
      expect(params.get("sort")).toBe("displayTime");
      expect(params.get("filter")).toContain("tagSearch:work");
      expect(params.get("filter")).toContain("displayTime:2026-08-02");
      expect(params.get("filter")).not.toContain("displayMonth");
    });
    fireEvent.click(screen.getByRole("button", { name: "Select month" }));
    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId("search").textContent ?? "");
      expect(params.get("sort")).toBe("displayTime");
      expect(params.get("filter")).toContain("tagSearch:work");
      expect(params.get("filter")).toContain("displayMonth:2026-09");
      expect(params.get("filter")).not.toContain("displayTime:");
    });
  });
});
