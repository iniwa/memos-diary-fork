import { describe, expect, it } from "vitest";
import { applyDisplayedTaskChanges } from "@/lib/diaryPresentation";

describe("diary presentation task updates", () => {
  it("retains stored image references and boundary tags", () => {
    const stored = "- [ ] Buy milk\n\n![local](/file/attachments/photo/a.jpg)\n\n#diary";
    expect(applyDisplayedTaskChanges(stored, "- [x] Buy milk")).toBe(stored.replace("- [ ]", "- [x]"));
  });
  it("preserves unrelated formatting and later tasks", () => {
    const stored = "1. [ ] First\n- [x] Second\n![image](https://example.test/a.png)";
    expect(applyDisplayedTaskChanges(stored, "1. [x] First\n- [x] Second")).toBe(stored.replace("1. [ ]", "1. [x]"));
  });
  it("saves quoted task toggles while preserving images and tags", () => {
    const stored = "> - [ ] Quoted task\n\n![photo](/file/attachments/photo/a.jpg)\n\n#diary";
    expect(applyDisplayedTaskChanges(stored, "> - [x] Quoted task")).toBe(stored.replace("[ ]", "[x]"));
  });
  it("does not treat fenced examples as interactive tasks", () => {
    const stored = "```md\n- [ ] Example\n```\n\n- [ ] Real\n\n#diary";
    const displayed = "```md\n- [ ] Example\n```\n\n- [x] Real";
    expect(applyDisplayedTaskChanges(stored, displayed)).toBe(stored.replace("[ ] Real", "[x] Real"));
  });
  it("retains nested ordered quotes, CRLF, and untouched uppercase task markers", () => {
    const stored = "> 1. [ ] First\r\n>    - [X] Nested\r\n\r\n#diary";
    expect(applyDisplayedTaskChanges(stored, "> 1. [x] First\n>    - [x] Nested")).toBe(stored.replace("[ ]", "[x]"));
  });
  it("saves empty tasks", () => {
    expect(applyDisplayedTaskChanges("- [ ]\n\n#diary", "- [x]")).toBe("- [x]\n\n#diary");
  });
  it("preserves image-only task references when the grid hides their body", () => {
    const stored = "- [ ] ![photo](/file/attachments/photo/a.jpg)\n- [ ] Next\n\n#diary";
    expect(applyDisplayedTaskChanges(stored, "- [x]\n- [ ] Next")).toBe(stored.replace("[ ] ![photo]", "[x] ![photo]"));
    expect(applyDisplayedTaskChanges(stored, "- [ ]\n- [x] Next")).toBe(stored.replace("[ ] Next", "[x] Next"));
  });
  it("rejects a structural mismatch", () => {
    expect(applyDisplayedTaskChanges("- [ ] First\n- [ ] Second", "- [x] First")).toBe("- [ ] First\n- [ ] Second");
  });
});
