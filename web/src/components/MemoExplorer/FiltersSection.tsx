import { ImageIcon } from "lucide-react";
import { useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";

const FiltersSection = () => {
  const t = useTranslate();
  const { getFiltersByFactor, addFilter, removeFilter } = useMemoFilterContext();

  const isImageFilterActive = getFiltersByFactor("attachment.hasImage").length > 0;

  const handleImageFilterToggle = () => {
    if (isImageFilterActive) {
      removeFilter((f) => f.factor === "attachment.hasImage");
    } else {
      addFilter({ factor: "attachment.hasImage", value: "true" });
    }
  };

  return (
    <div className="w-full flex flex-col justify-start items-start mt-3 px-1 shrink-0">
      <div className="mb-1 text-sm leading-6 text-muted-foreground select-none">{t("memo.filters.label")}</div>
      <div className="w-full flex flex-row flex-wrap gap-x-2 gap-y-1.5">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-sm leading-6 rounded-md select-none cursor-pointer transition-colors hover:opacity-80",
            isImageFilterActive ? "font-medium text-primary" : "text-muted-foreground",
          )}
          onClick={handleImageFilterToggle}
        >
          <ImageIcon className="h-4 w-4 shrink-0" />
          <span>{t("memo.filters.has-image")}</span>
        </button>
      </div>
    </div>
  );
};

export default FiltersSection;
