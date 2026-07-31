import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { stringifyFilters } from "@/contexts/MemoFilterContext";

export const useMonthFilterNavigation = (targetPath?: string) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToMonthFilter = useCallback(
    (month: string) => {
      const filterQuery = stringifyFilters([{ factor: "displayMonth", value: month }]);
      const basePath = targetPath ?? location.pathname;
      navigate(`${basePath}?filter=${filterQuery}`);
    },
    [navigate, location.pathname, targetPath],
  );

  return navigateToMonthFilter;
};
