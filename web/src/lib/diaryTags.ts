const HIDDEN_LEGACY_TAGS = new Set(["photo"]);

export function normalizeDiaryTag(tag: string): string {
  return tag.trim().replace(/^#+/, "");
}

export function isHiddenLegacyTag(tag: string): boolean {
  return HIDDEN_LEGACY_TAGS.has(normalizeDiaryTag(tag));
}

export function getVisibleDiaryTags(tags: string[]): string[] {
  return tags.filter((tag) => !isHiddenLegacyTag(tag));
}
