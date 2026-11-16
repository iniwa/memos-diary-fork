import { parseTaskItems } from "@/utils/markdown-task-actions";

/** Map task changes to stored Markdown without persisting the diary's hidden image/tag presentation. */
export function applyDisplayedTaskChanges(stored: string, displayed: string): string {
  const original = parseTaskItems(stored);
  const changed = parseTaskItems(displayed);
  if (original.length !== changed.length) return stored;
  let result = stored;
  for (let index = original.length - 1; index >= 0; index--) {
    const marker = original[index];
    if (marker.checked === changed[index].checked) continue;
    const { start, end } = marker.checkboxMarker;
    result = result.slice(0, start) + (changed[index].checked ? "x" : " ") + result.slice(end);
  }
  return result;
}
