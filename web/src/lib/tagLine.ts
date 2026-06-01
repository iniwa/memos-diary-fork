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
