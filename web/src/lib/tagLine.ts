/**
 * Detects whether a (trimmed) line consists exclusively of `#tag` tokens.
 * Each token must start with exactly one `#` followed by at least one
 * non-whitespace, non-`#` character.  `##word` is excluded per remark-tag
 * semantics.
 */
function isTagOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  return words.length > 0 && words.every((w) => /^#[^#\s]\S*$/.test(w));
}

export interface TagLineResult {
  /** Body text with the trailing tag line removed. */
  body: string;
  /** Tag values without the leading `#`. */
  tags: string[];
}

/**
 * If `content` ends with a tag-only line (ignoring trailing blank lines),
 * returns the body without that line and the extracted tag values.
 * Otherwise returns the full content as the body with an empty tag array.
 */
export function extractTrailingTagLine(content: string): TagLineResult {
  if (!content.trim()) return { body: content, tags: [] };

  const lines = content.split("\n");

  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && !lines[lastIdx].trim()) {
    lastIdx--;
  }

  if (lastIdx < 0 || !isTagOnlyLine(lines[lastIdx])) {
    return { body: content, tags: [] };
  }

  const tagLine = lines[lastIdx].trim();
  const tags = tagLine.split(/\s+/).map((w) => w.slice(1));

  const bodyLines = lines.slice(0, lastIdx);
  while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) {
    bodyLines.pop();
  }

  return { body: bodyLines.join("\n"), tags };
}

/**
 * Extracts at most one leading and one trailing tag-only line, merges and
 * de-duplicates their tags (leading order first), and returns the remaining
 * body with surrounding blank lines trimmed.
 *
 * - Leading/trailing blank lines are ignored when locating candidate lines.
 * - A line must consist exclusively of `#tag` tokens to qualify.
 * - Inline prose tags are left untouched.
 * - If both boundaries are the same line (single-line content), only the
 *   trailing extraction path runs so the line is not double-counted.
 */
export function extractBoundaryTagLines(content: string): TagLineResult {
  if (!content.trim()) return { body: content, tags: [] };

  const lines = content.split("\n");

  // Locate last non-empty line
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && !lines[lastIdx].trim()) lastIdx--;
  if (lastIdx < 0) return { body: content, tags: [] };

  // Locate first non-empty line
  let firstIdx = 0;
  while (firstIdx <= lastIdx && !lines[firstIdx].trim()) firstIdx++;

  // Check trailing tag line
  let trailingTags: string[] = [];
  let trailingIdx = -1;
  if (isTagOnlyLine(lines[lastIdx])) {
    trailingTags = lines[lastIdx]
      .trim()
      .split(/\s+/)
      .map((w) => w.slice(1));
    trailingIdx = lastIdx;
  }

  // Check leading tag line only when it is a different line from the trailing one.
  let leadingTags: string[] = [];
  let leadingIdx = -1;
  const leadingSearchEnd = trailingIdx >= 0 ? trailingIdx - 1 : lastIdx;
  if (firstIdx <= leadingSearchEnd && isTagOnlyLine(lines[firstIdx])) {
    leadingTags = lines[firstIdx]
      .trim()
      .split(/\s+/)
      .map((w) => w.slice(1));
    leadingIdx = firstIdx;
  }

  if (trailingTags.length === 0 && leadingTags.length === 0) {
    return { body: content, tags: [] };
  }

  // Merge: leading tags first, then trailing; de-duplicate preserving order
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const t of [...leadingTags, ...trailingTags]) {
    if (!seen.has(t)) {
      seen.add(t);
      tags.push(t);
    }
  }

  // Extract body lines between the two stripped boundary lines
  const bodyStart = leadingIdx >= 0 ? leadingIdx + 1 : 0;
  const bodyEnd = trailingIdx >= 0 ? trailingIdx : lines.length;
  const bodyLines = lines.slice(bodyStart, bodyEnd);

  while (bodyLines.length > 0 && !bodyLines[0].trim()) bodyLines.shift();
  while (bodyLines.length > 0 && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();

  return { body: bodyLines.join("\n"), tags };
}

export function buildTagLine(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(" ");
}

/**
 * Combines a body string with a tag array into the stored memo content
 * format: body text followed by a single trailing tag line.
 */
export function serializeTagContent(body: string, tags: string[]): string {
  if (!tags.length) return body;
  const trimmed = body.trimEnd();
  const tagLine = buildTagLine(tags);
  return trimmed ? `${trimmed}\n${tagLine}` : tagLine;
}
