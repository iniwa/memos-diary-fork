import { describe, expect, it } from "vitest";
import { getVisibleDiaryTags, isHiddenLegacyTag, normalizeDiaryTag } from "@/lib/diaryTags";

describe("diary tag visibility", () => {
  it("hides only the exact legacy photo tag", () => {
    expect(isHiddenLegacyTag("photo")).toBe(true);
    expect(isHiddenLegacyTag("#photo")).toBe(true);
    expect(isHiddenLegacyTag("Photo")).toBe(false);
    expect(isHiddenLegacyTag("photography")).toBe(false);
    expect(isHiddenLegacyTag("photo/album")).toBe(false);
  });

  it("preserves visible slash and japanese tags", () => {
    expect(getVisibleDiaryTags(["restaurant/cleis", "photo", "game/FF14", "restaurant/\u65e5\u672c"])).toEqual([
      "restaurant/cleis",
      "game/FF14",
      "restaurant/\u65e5\u672c",
    ]);
  });

  it("normalizes leading hashes for input checks", () => {
    expect(normalizeDiaryTag("##photo")).toBe("photo");
  });
});
