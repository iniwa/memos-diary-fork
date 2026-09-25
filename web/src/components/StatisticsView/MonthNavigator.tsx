import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { YearCalendar } from "@/components/ActivityCalendar/YearCalendar";
import { SIDEBAR_ROW_BOX_CLASSES } from "@/components/AppSidebar/SidebarRow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    <header className={cn(SIDEBAR_ROW_BOX_CLASSES, "mb-1.5 justify-between")}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <h2 className="min-w-0 truncate font-medium tracking-[-0.015em] text-foreground/90 select-none">
          <DialogTrigger render={<button type="button" className="cursor-pointer hover:text-foreground" />}>{monthLabel}</DialogTrigger>
        </h2>
        <DialogContent size="2xl" className="p-0 md:max-w-6xl w-[min(100vw-24px,1200px)] max-h-[85vh]" showCloseButton={false}>
          <DialogTitle className="sr-only">{t("common.month-navigation")}</DialogTitle>
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
        </DialogContent>
      </Dialog>

      <nav className="flex shrink-0 items-center gap-0.5" aria-label={t("common.month-navigation")}>
        <Button variant="quiet" size="icon-sm" onClick={handlePrevMonth} aria-label={t("common.previous-month")}>
          <ChevronLeftIcon className="size-4 rtl:rotate-180" strokeWidth={1.75} />
        </Button>

        <Button variant="quiet" size="icon-sm" onClick={handleNextMonth} aria-label={t("common.next-month")}>
          <ChevronRightIcon className="size-4 rtl:rotate-180" strokeWidth={1.75} />
        </Button>
      </nav>
    </header>
  );
});

MonthNavigator.displayName = "MonthNavigator";
