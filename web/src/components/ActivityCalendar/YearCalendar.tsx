import { Button } from "@usememos/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { memo, useMemo } from "react";
import type { MemoTimeBasis } from "@/contexts/ViewContext";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";
import { MonthCalendar } from "./MonthCalendar";
import type { CalendarData, YearCalendarProps } from "./types";
import { filterDataByYear, generateMonthsForYear, getMonthLabel } from "./utils";

interface YearNavigationProps {
  selectedYear: number;
  currentYear: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

const YearNavigation = memo(({ selectedYear, currentYear, onPrev, onNext, onToday, canGoPrev, canGoNext }: YearNavigationProps) => {
  const t = useTranslate();
  const isCurrentYear = selectedYear === currentYear;

  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="mu-heading text-mu-text tracking-tight">{selectedYear}</h2>

      <nav
        className="inline-flex items-center gap-0.5 rounded-lg border border-mu-line/30 bg-mu-hover/10 p-0.5"
        aria-label="Year navigation"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Previous year"
          className="h-7 w-7 p-0 rounded-md text-mu-text-secondary hover:text-mu-text hover:bg-mu-hover/40"
          icon={<ChevronLeftIcon />}
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={onToday}
          disabled={isCurrentYear}
          aria-label={t("common.today")}
          className={cn(
            "h-7 px-2.5 rounded-md mu-caption uppercase tracking-wider",
            isCurrentYear ? "text-mu-text-secondary/50 cursor-default" : "text-mu-text-secondary hover:text-mu-text hover:bg-mu-hover/40",
          )}
        >
          {t("common.today")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next year"
          className="h-7 w-7 p-0 rounded-md text-mu-text-secondary hover:text-mu-text hover:bg-mu-hover/40"
          icon={<ChevronRightIcon />}
        />
      </nav>
    </div>
  );
});
YearNavigation.displayName = "YearNavigation";

interface MonthCardProps {
  month: string;
  data: CalendarData;
  onDateClick: (date: string) => void;
  onMonthClick?: (month: string) => void;
  timeBasis?: MemoTimeBasis;
}

const MonthCard = memo(({ month, data, onDateClick, onMonthClick, timeBasis }: MonthCardProps) => (
  <article className="flex flex-col gap-2 rounded-xl border border-mu-line/20 bg-mu-hover/5 p-3 transition-colors hover:bg-mu-hover/10">
    <header className="mu-caption font-medium text-mu-text-secondary/80 uppercase tracking-widest">
      {onMonthClick ? (
        <button type="button" onClick={() => onMonthClick(month)} className="cursor-pointer transition-colors hover:text-mu-text">
          {getMonthLabel(month)}
        </button>
      ) : (
        getMonthLabel(month)
      )}
    </header>
    <MonthCalendar month={month} data={data} onClick={onDateClick} timeBasis={timeBasis} />
  </article>
));
MonthCard.displayName = "MonthCard";

export const YearCalendar = memo(
  ({ selectedYear, data, onYearChange, onDateClick, onMonthClick, className, timeBasis }: YearCalendarProps) => {
    const currentYear = useMemo(() => new Date().getFullYear(), []);
    const yearData = useMemo(() => filterDataByYear(data, selectedYear), [data, selectedYear]);
    const months = useMemo(() => generateMonthsForYear(selectedYear), [selectedYear]);

    const canGoPrev = selectedYear > 1970;
    const canGoNext = selectedYear < currentYear + 1;

    return (
      <section className={cn("w-full flex flex-col gap-5 px-4 py-4 select-none", className)} aria-label={`Year ${selectedYear} calendar`}>
        <YearNavigation
          selectedYear={selectedYear}
          currentYear={currentYear}
          onPrev={() => canGoPrev && onYearChange(selectedYear - 1)}
          onNext={() => canGoNext && onYearChange(selectedYear + 1)}
          onToday={() => onYearChange(currentYear)}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-fade-in">
          {months.map((month) => (
            <MonthCard
              key={month}
              month={month}
              data={yearData}
              onDateClick={onDateClick}
              onMonthClick={onMonthClick}
              timeBasis={timeBasis}
            />
          ))}
        </div>
      </section>
    );
  },
);

YearCalendar.displayName = "YearCalendar";
