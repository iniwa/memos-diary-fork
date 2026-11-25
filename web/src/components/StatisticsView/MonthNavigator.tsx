import { Button, Dialog, Tooltip } from "@usememos/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { YearCalendar } from "@/components/ActivityCalendar/YearCalendar";
import { SIDEBAR_ROW_BOX_CLASSES } from "@/components/AppSidebar/SidebarRow";
import { addMonths, formatMonthLabel } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { MonthNavigatorProps } from "@/types/statistics";

export const MonthNavigator = memo(({ visibleMonth, onMonthChange, activityStats = {}, timeBasis, onMonthClick }: MonthNavigatorProps) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const monthLabel = formatMonthLabel(visibleMonth, i18n.language);
  const handlePrevMonth = () => onMonthChange(addMonths(visibleMonth, -1));
  const handleNextMonth = () => onMonthChange(addMonths(visibleMonth, 1));

  return (
    <header className={cn(SIDEBAR_ROW_BOX_CLASSES, "mb-2 justify-between pe-1")}>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <h2 className="min-w-0 truncate font-medium tracking-[-0.015em] text-mu-text select-none">
          <Dialog.Trigger render={<button type="button" className="cursor-pointer hover:text-mu-text" />}>{monthLabel}</Dialog.Trigger>
        </h2>
        <Dialog.Popup variant="bare" sheet={false} className="p-0 max-w-6xl w-[min(100vw-24px,1200px)] max-h-[85vh] overflow-auto">
          <Dialog.Title className="sr-only">{t("common.month-navigation")}</Dialog.Title>
          <YearCalendar
            selectedYear={Number(visibleMonth.slice(0, 4))}
            data={activityStats}
            onYearChange={(year) => onMonthChange(`${year}-${visibleMonth.slice(5, 7)}`)}
            onDateClick={(date) => {
              onMonthChange(date.slice(0, 7));
              setIsOpen(false);
            }}
            onMonthClick={
              onMonthClick
                ? (month) => {
                    onMonthChange(month);
                    onMonthClick(month);
                    setIsOpen(false);
                  }
                : undefined
            }
            timeBasis={timeBasis}
          />
        </Dialog.Popup>
      </Dialog.Root>

      <nav className="flex shrink-0 items-center gap-0.5" aria-label={t("common.month-navigation")}>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Button
                variant="ghost"
                size="xs"
                onClick={handlePrevMonth}
                aria-label={t("common.previous-month")}
                icon={<ChevronLeftIcon className="rtl:rotate-180" />}
              />
            }
          />
          <Tooltip.Popup>{t("common.previous-month")}</Tooltip.Popup>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Button
                variant="ghost"
                size="xs"
                onClick={handleNextMonth}
                aria-label={t("common.next-month")}
                icon={<ChevronRightIcon className="rtl:rotate-180" />}
              />
            }
          />
          <Tooltip.Popup>{t("common.next-month")}</Tooltip.Popup>
        </Tooltip.Root>
      </nav>
    </header>
  );
});

MonthNavigator.displayName = "MonthNavigator";
