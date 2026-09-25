import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { replaceFiltersByFactor, stringifyFilters, useMemoFilterContext } from "@/contexts/MemoFilterContext";

export const useMonthFilterNavigation = (targetPath?: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, setFilters } = useMemoFilterContext();

  return useCallback(
    (month: string) => {
      const nextFilters = replaceFiltersByFactor(
        filters.filter((filter) => filter.factor !== "displayTime"),
        "displayMonth",
        [{ factor: "displayMonth", value: month }],
      );
      const nextSearchParams = new URLSearchParams(location.search);
      nextSearchParams.set("filter", stringifyFilters(nextFilters));
      setFilters(nextFilters);
      navigate({ pathname: targetPath ?? location.pathname, search: nextSearchParams.toString() });
    },
    [filters, location.pathname, location.search, navigate, setFilters, targetPath],
  );
};
