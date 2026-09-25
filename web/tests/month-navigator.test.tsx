import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SIDEBAR_ROW_BOX_CLASSES } from "@/components/AppSidebar/SidebarRow";
import { MonthNavigator } from "@/components/StatisticsView/MonthNavigator";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (key: string) => key }),
}));

vi.mock("@/contexts/InstanceContext", () => ({ useInstance: () => ({ generalSetting: { weekStartDayOffset: 0 } }) }));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

describe("MonthNavigator", () => {
  it("retains previous and next month actions", () => {
    const onMonthChange = vi.fn();
    render(<MonthNavigator visibleMonth="2026-08" onMonthChange={onMonthChange} />);

    const heading = screen.getByRole("heading", { name: "August 2026", level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.closest("header")).toHaveClass(...SIDEBAR_ROW_BOX_CLASSES.split(" "));
    expect(screen.getByRole("button", { name: "August 2026" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "common.previous-month" }));
    expect(onMonthChange).toHaveBeenCalledWith("2026-07");

    fireEvent.click(screen.getByRole("button", { name: "common.next-month" }));
    expect(onMonthChange).toHaveBeenCalledWith("2026-09");
  });
  it("opens a year picker and filters on a month heading", async () => {
    const onMonthClick = vi.fn();
    const onMonthChange = vi.fn();
    render(<MonthNavigator visibleMonth="2026-08" onMonthChange={onMonthChange} onMonthClick={onMonthClick} />);
    fireEvent.click(screen.getByRole("button", { name: "August 2026" }));
    const label = new Date("2026-05-01T00:00:00").toLocaleDateString(undefined, { month: "short" });
    fireEvent.click(await screen.findByRole("button", { name: label }));
    expect(onMonthClick).toHaveBeenCalledWith("2026-05");
    expect(onMonthChange).toHaveBeenCalledWith("2026-05");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
