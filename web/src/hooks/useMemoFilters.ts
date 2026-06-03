import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { buildMemoCreatorFilter } from "@/helpers/resource-names";
import { Visibility } from "@/types/proto/api/v1/memo_service_pb";

const getVisibilityName = (visibility: Visibility): string => {
  switch (visibility) {
    case Visibility.PUBLIC:
      return "PUBLIC";
    case Visibility.PROTECTED:
      return "PROTECTED";
    case Visibility.PRIVATE:
      return "PRIVATE";
    default:
      return "PRIVATE";
  }
};

const getShortcutId = (name: string): string => {
  const parts = name.split("/");
  return parts.length === 4 ? parts[3] : "";
};

const escapeFilterValue = (value: string): string => JSON.stringify(value);

const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function parseMonthFilterRange(value: string): { start: number; end: number } | undefined {
  const match = MONTH_RE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return undefined;
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime() / 1000;
  const end = new Date(year, month, 1, 0, 0, 0, 0).getTime() / 1000;
  return { start, end };
}

export interface UseMemoFiltersOptions {
  creatorName?: string;
  includeShortcuts?: boolean;
  includePinned?: boolean;
  visibilities?: Visibility[];
}

export const useMemoFilters = (options: UseMemoFiltersOptions = {}): string | undefined => {
  const { creatorName, includeShortcuts = false, includePinned = false, visibilities } = options;

  const { shortcuts } = useAuth();
  const { filters, shortcut: currentShortcut } = useMemoFilterContext();

  // Get selected shortcut if needed
  const selectedShortcut = useMemo(() => {
    if (!includeShortcuts) return undefined;
    return shortcuts.find((shortcut) => getShortcutId(shortcut.name) === currentShortcut);
  }, [includeShortcuts, currentShortcut, shortcuts]);

  // Build filter
  return useMemo(() => {
    const conditions: string[] = [];

    // Add creator filter if provided
    if (creatorName) {
      const creatorFilter = buildMemoCreatorFilter(creatorName);
      if (creatorFilter) {
        conditions.push(creatorFilter);
      }
    }

    // Add shortcut filter if enabled and selected
    if (includeShortcuts && selectedShortcut?.filter) {
      conditions.push(selectedShortcut.filter);
    }

    // Add active filters from context
    for (const filter of filters) {
      if (filter.factor === "contentSearch") {
        conditions.push(`content.contains(${escapeFilterValue(filter.value)})`);
      } else if (filter.factor === "tagSearch") {
        conditions.push(`tag in [${escapeFilterValue(filter.value)}]`);
      } else if (filter.factor === "pinned") {
        if (includePinned) {
          conditions.push(`pinned`);
        }
      } else if (filter.factor === "property.hasLink") {
        conditions.push(`has_link`);
      } else if (filter.factor === "property.hasTaskList") {
        conditions.push(`has_task_list`);
      } else if (filter.factor === "property.hasCode") {
        conditions.push(`has_code`);
      } else if (filter.factor === "attachment.hasImage") {
        conditions.push(`has_image_attachment`);
      } else if (filter.factor === "displayTime") {
        const filterDate = new Date(filter.value);
        const filterUtcTimestamp = filterDate.getTime() + filterDate.getTimezoneOffset() * 60 * 1000;
        const timestampAfter = filterUtcTimestamp / 1000;

        conditions.push(`created_ts >= ${timestampAfter} && created_ts < ${timestampAfter + 60 * 60 * 24}`);
      } else if (filter.factor === "displayMonth") {
        const range = parseMonthFilterRange(filter.value);
        if (range) {
          conditions.push(`created_ts >= ${range.start} && created_ts < ${range.end}`);
        }
      }
    }

    // Add visibility filter if specified
    if (visibilities && visibilities.length > 0) {
      const visibilityValues = visibilities.map((v) => `"${getVisibilityName(v)}"`).join(", ");
      conditions.push(`visibility in [${visibilityValues}]`);
    }

    return conditions.length > 0 ? conditions.join(" && ") : undefined;
  }, [creatorName, includeShortcuts, includePinned, visibilities, selectedShortcut, filters]);
};
