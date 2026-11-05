import { create } from "@bufbuild/protobuf";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MemoBody from "@/components/MemoView/components/MemoBody";
import { AttachmentSchema, MotionMediaFamily, MotionMediaRole, MotionMediaSchema } from "@/types/proto/api/attachment_service_pb";
import { MemoSchema } from "@/types/proto/api/memo_service_pb";

const state = vi.hoisted(() => ({ memo: {} as unknown, openPreview: vi.fn() }));
vi.mock("@/components/MemoView/MemoViewContext", () => ({
  useMemoViewContext: () => ({ memo: state.memo, openPreview: state.openPreview, parentPage: "" }),
}));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));
vi.mock("@/components/MemoEditor/MemoEditor", () => ({
  MemoEditor: ({ displayContent }: { displayContent: string }) => <div data-testid="body">{displayContent}</div>,
}));
vi.mock("@/components/MemoEditor/view/useTagNavigation", () => ({ useTagNavigation: () => vi.fn() }));
vi.mock("@/components/MemoMetadata", () => ({ AttachmentGallery: () => null, MemoMetadataRows: () => null }));
vi.mock("@/components/MemoReactionListView", () => ({ MemoReactionListView: () => null }));
vi.mock("@/components/MemoView/hooks", () => ({ useMemoHandlers: () => ({}) }));
vi.mock("@/components/MotionPhotoPreview", () => ({
  default: ({ posterUrl, motionUrl }: { posterUrl: string; motionUrl: string }) => (
    <div data-testid="motion" data-poster={posterUrl} data-motion={motionUrl} />
  ),
}));

const image = (uid: string) => create(AttachmentSchema, { name: `attachments/${uid}`, filename: `${uid}.jpg`, type: "image/jpeg" });
const markdown = (uid: string) => `![${uid}](/file/attachments/${uid})`;
const show = (content: string, attachments = [image("one")]) => {
  const memo = create(MemoSchema, { name: "memos/test", content, attachments });
  const before = JSON.stringify(memo, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
  state.memo = memo;
  const result = render(<MemoBody />);
  expect(JSON.stringify(memo, (_key, value) => (typeof value === "bigint" ? value.toString() : value))).toBe(before);
  return result;
};

beforeEach(() => state.openPreview.mockReset());

describe("Diary memo image presentation", () => {
  it.each([0, 1, 4, 5])("collects %i managed images in the existing grid without editing the memo", (count) => {
    const images = Array.from({ length: count }, (_, i) => image(`photo-${i}`));
    show(["Diary", ...images.map((item) => markdown(item.name.split("/")[1]!))].join("\n\n"), images);
    expect(screen.getByTestId("body").textContent?.trim()).toBe("Diary");
    expect(screen.queryAllByRole("img")).toHaveLength(Math.min(count, 4));
    expect(screen.queryByText("+1") !== null).toBe(count === 5);
    if (count === 4 || count === 5)
      expect(screen.getAllByRole("img")[0].parentElement?.parentElement?.parentElement).toHaveClass("grid-cols-2", "grid-rows-2");
  });

  it("preserves surrounding prose, code, external images and unresolved managed references", () => {
    const external = "![external](https://example.com/image.jpg)";
    const unresolved = markdown("missing");
    const code = `\`${markdown("one")}\``;
    show(`before ${markdown("one")} after\n\n${external}\n\n${unresolved}\n\n${code}`);
    expect(screen.getByTestId("body").textContent).toBe(`before  after\n\n${external}\n\n${unresolved}\n\n${code}`);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("leaves an external-only body unchanged", () => {
    const content = "before ![external](https://example.com/image.jpg) after";
    show(content, []);
    expect(screen.getByTestId("body").textContent).toBe(content);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("keeps canonical attachment order, deduplicates references, crops tiles and previews full source URLs", () => {
    show(`${markdown("two")}\n\n${markdown("one")}\n\n${markdown("two")}`, [image("one"), image("two"), image("one")]);
    const tiles = screen.getAllByRole("img");
    expect(tiles.map((tile) => tile.getAttribute("alt"))).toEqual(["one.jpg", "two.jpg"]);
    expect(tiles[0]).toHaveClass("object-cover");
    expect(tiles[0].getAttribute("src")).toContain("?thumbnail=true");
    fireEvent.click(tiles[1]);
    expect(state.openPreview).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ sourceUrl: `${window.location.origin}/file/attachments/two/two.jpg` })]),
      1,
    );
  });

  it("retains +N expansion and collapse and previews the fifth image", () => {
    const images = Array.from({ length: 5 }, (_, i) => image(`photo-${i}`));
    show(images.map((item) => markdown(item.name.split("/")[1]!)).join("\n\n"), images);
    fireEvent.click(screen.getByRole("button", { name: "common.expand" }));
    expect(state.openPreview).not.toHaveBeenCalled();
    expect(screen.getAllByRole("img")).toHaveLength(5);
    fireEvent.click(screen.getAllByRole("img")[4]);
    expect(state.openPreview).toHaveBeenCalledWith(expect.any(Array), 4);
    fireEvent.click(screen.getByRole("button", { name: "common.collapse" }));
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("retains external attachment placement instead of duplicating it in the grid", () => {
    const external = create(AttachmentSchema, { ...image("external"), externalLink: "https://example.com/image.jpg" });
    const content = `${markdown("one")}\n\n${markdown("external")}`;
    show(content, [image("one"), external]);
    expect(screen.getByTestId("body").textContent?.trim()).toBe(markdown("external"));
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("keeps Live Photo still/video pairs as one item alongside ordinary images", () => {
    const motionMedia = create(MotionMediaSchema, {
      family: MotionMediaFamily.APPLE_LIVE_PHOTO,
      role: MotionMediaRole.STILL,
      groupId: "live",
    });
    const still = create(AttachmentSchema, { ...image("still"), motionMedia });
    const video = create(AttachmentSchema, {
      name: "attachments/video",
      filename: "live.mov",
      type: "video/quicktime",
      motionMedia: create(MotionMediaSchema, { ...motionMedia, role: MotionMediaRole.VIDEO }),
    });
    show(`${markdown("still")}\n\n${markdown("still")}\n\n${markdown("one")}`, [still, video, image("one")]);
    expect(screen.getByTestId("body").textContent?.trim()).toBe("");
    expect(screen.getAllByTestId("motion")).toHaveLength(1);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("motion"));
    expect(state.openPreview).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ kind: "motion", motionUrl: `${window.location.origin}/file/attachments/video/live.mov` }),
      ]),
      0,
    );
  });
});
