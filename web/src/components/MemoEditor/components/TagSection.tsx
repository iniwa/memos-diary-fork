import type { FC, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { matchPath } from "react-router-dom";
import { useTagCounts } from "@/hooks/useUserQueries";
import { cn } from "@/lib/utils";
import { Routes } from "@/router";
import { useTranslate } from "@/utils/i18n";
import { useEditorContext } from "../state";

export const TagSection: FC = () => {
  const t = useTranslate();
  const { state, actions, dispatch } = useEditorContext();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExplorePage = Boolean(matchPath(Routes.EXPLORE, window.location.pathname));
  const { data: tagCounts = {} } = useTagCounts(!isExplorePage);

  const suggestions = useMemo(() => {
    const query = inputValue.replace(/^#+/, "").toLowerCase();
    return Object.keys(tagCounts)
      .filter((tag) => !state.tags.includes(tag) && (!query || tag.toLowerCase().includes(query)))
      .sort((a, b) => (tagCounts[b] ?? 0) - (tagCounts[a] ?? 0) || a.localeCompare(b))
      .slice(0, 8);
  }, [inputValue, tagCounts, state.tags]);

  useEffect(() => {
    setSelectedIdx(-1);
  }, [suggestions]);

  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#+/, "");
    if (!tag || state.tags.includes(tag)) return;
    dispatch(actions.setTags([...state.tags, tag]));
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    dispatch(actions.setTags(state.tags.filter((t) => t !== tag)));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (e.key === " " && inputValue.trim())) {
      e.preventDefault();
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        addTag(suggestions[selectedIdx]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIdx(-1);
    } else if (e.key === "Backspace" && !inputValue && state.tags.length > 0) {
      removeTag(state.tags[state.tags.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-wrap items-center gap-1 min-h-[28px] px-1 py-0.5">
        <span className="text-xs text-muted-foreground select-none shrink-0">{t("editor.tags")}</span>

        {state.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
          >
            <span>#{tag}</span>
            <button
              type="button"
              className="ml-0.5 opacity-50 hover:opacity-100 leading-none transition-opacity"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={state.tags.length === 0 ? t("editor.add-tag") : ""}
          className="flex-1 min-w-[100px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-md border bg-popover shadow-md overflow-hidden">
          {suggestions.map((tag, index) => (
            <button
              key={tag}
              type="button"
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                index === selectedIdx && "bg-accent text-accent-foreground",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(tag);
              }}
            >
              <span className="text-muted-foreground mr-1">#</span>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
