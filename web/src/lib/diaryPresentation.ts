import { lineTable, visit } from "@usememos/editor";
import { parseMemoAst } from "@/lib/memo-ast";

interface TaskMarker {
  offset: number;
  checked: boolean;
}

// Use the same parser as the viewer: quoted tasks count, fenced/indented code does not.
function taskMarkers(markdown: string): TaskMarker[] {
  const lines = lineTable(markdown);
  const markers: TaskMarker[] = [];
  visit(parseMemoAst(markdown), (node) => {
    if (node.type !== "listItem" || !node.task) return;
    const line = node.lines?.start;
    if (line === undefined) return;
    const start = lines.starts[line - 1];
    // Empty tasks have no paragraph/source. The AST still identifies their exact
    // source line, whose first checkbox marker belongs to this task.
    const marker = /\[[ xX]\]/.exec(markdown.slice(start, lines.ends[line - 1]));
    if (marker) markers.push({ offset: start + marker.index + 1, checked: node.checked });
  });
  return markers;
}

/** Map task changes to stored Markdown without persisting the diary's hidden image/tag presentation. */
export function applyDisplayedTaskChanges(stored: string, displayed: string): string {
  const original = taskMarkers(stored);
  const changed = taskMarkers(displayed);
  if (original.length !== changed.length) return stored;
  let result = stored;
  for (let index = original.length - 1; index >= 0; index--) {
    const marker = original[index];
    if (marker.checked === changed[index].checked) continue;
    result = result.slice(0, marker.offset) + (changed[index].checked ? "x" : " ") + result.slice(marker.offset + 1);
  }
  return result;
}
