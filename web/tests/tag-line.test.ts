import { describe, expect, it } from "vitest";
import { extractBoundaryTagLines, serializeTagContent } from "@/lib/tagLine";

describe("tag line persistence", () => {
  it("round-trips merged leading and trailing tag lines", () => {
    const parsed = extractBoundaryTagLines("\n#work #diary\n\nBody text\n\n#diary #photo\n\n");

    expect(parsed).toEqual({
      body: "Body text",
      tags: ["work", "diary", "photo"],
    });
    expect(serializeTagContent(parsed.body, parsed.tags)).toBe("Body text\n#work #diary #photo");
  });

  it("does not treat remark-style double hashes as tag-only lines", () => {
    const parsed = extractBoundaryTagLines("##heading\nBody\n##word");

    expect(parsed).toEqual({ body: "##heading\nBody\n##word", tags: [] });
  });

  it("trims blank lines around the body when boundary tags are extracted", () => {
    const parsed = extractBoundaryTagLines("#start\n\nBody\n\n#end");

    expect(parsed).toEqual({ body: "Body", tags: ["start", "end"] });
    expect(serializeTagContent(parsed.body, parsed.tags)).toBe("Body\n#start #end");
  });

  it("serializes tag-only content without a leading blank line", () => {
    expect(serializeTagContent("\n", ["daily"])).toBe("#daily");
  });
});