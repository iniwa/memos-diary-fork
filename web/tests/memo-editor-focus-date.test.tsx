import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoEditor, preloadMemoEditing } from "@/components/MemoEditor";
import { draftKeyFor } from "@/components/MemoEditor/edit/draftKey";
import { cacheService } from "@/components/MemoEditor/edit/services";
import { GlobalMemoEditorProvider, useGlobalMemoEditor } from "@/contexts/GlobalMemoEditorContext";
import { showErrorToast } from "@/lib/toast";
import { AttachmentSchema } from "@/types/proto/api/attachment_service_pb";
import { type Memo, MemoSchema, Visibility } from "@/types/proto/api/memo_service_pb";

const api = vi.hoisted(() => ({ createMemo: vi.fn(), createMemoComment: vi.fn(), getMemo: vi.fn(), updateMemo: vi.fn() }));
const attachmentApi = vi.hoisted(() => ({ uploadAttachment: vi.fn() }));
const auth = vi.hoisted(() => ({ userGeneralSetting: { memoVisibility: "PRIVATE" }, isUserSettingsInitialized: true }));
const instance = vi.hoisted(() => ({
  aiSetting: { providers: [], transcription: undefined },
  fetchSetting: vi.fn().mockResolvedValue(undefined),
}));

// Only account/network/layout boundaries are mocked. MemoEditor, EditSession,
// date controls, store, save hook, mutations and the hosted dialog are real.
vi.mock("@/connect", () => ({ memoServiceClient: api, attachmentServiceClient: attachmentApi, userServiceClient: {} }));
vi.mock("@/hooks/useCurrentUser", () => ({ default: () => ({ name: "users/1" }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/contexts/InstanceContext", () => ({ useInstance: () => instance }));
vi.mock("@/contexts/NewMemoContext", () => ({ useNewMemo: () => ({ markNewMemo: vi.fn() }) }));
vi.mock("@/contexts/AppSidebarContext", () => ({ useAppSidebar: () => ({ setMobileOpen: vi.fn(), setQuickFindOpen: vi.fn() }) }));
vi.mock("@/contexts/SpaceContext", () => ({ useSpaceContext: () => ({ selectedSpaceName: undefined, isSpaceReady: true }) }));
vi.mock("@/hooks/useSpaceQueries", () => ({ useSpaces: () => ({ data: [] }) }));
vi.mock("@/hooks/useUserQueries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useUserQueries")>()),
  useTagCounts: () => ({ data: {} }),
  useUsersByUsernames: () => ({ data: undefined }),
  useUpdateUserEditorSetting: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/useMemoSuggestions", () => ({ useMemoSuggestions: () => [] }));
vi.mock("@/hooks/useMediaQuery", () => ({ default: () => true }));
vi.mock("@/utils/i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/i18n")>()),
  useTranslate: () => (key: string) => key,
}));
vi.mock("@/lib/toast", () => ({ toast: { add: vi.fn(), close: vi.fn() }, showErrorToast: vi.fn() }));

vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const now = new Date(2026, 10, 16, 12, 13, 14);
const chosenCreate = new Date(2024, 1, 29, 12, 34, 56);
const chosenUpdate = new Date(2024, 2, 1, 13, 35, 57);
const dateButton = () => screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2} / });
const setDateButton = () => screen.queryAllByRole("button", { name: "editor.diary-date-control.set-date" });
const enterFocus = async () => {
  fireEvent.click(screen.getByRole("button", { name: "common.add" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "editor.focus-mode" }));
  await screen.findByRole("button", { name: "editor.exit-focus-mode" });
};
const closeDate = async () => {
  fireEvent.keyDown(screen.getByRole("textbox", { name: /^common\.created-at/ }), { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("textbox", { name: /^common\.created-at/ })).not.toBeInTheDocument());
};
const mount = (editor: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter>{editor}</MemoryRouter>
    </QueryClientProvider>,
  );
const seedDraft = (scope: string) =>
  cacheService.saveNow(cacheService.key("users/1", draftKeyFor({ kind: "new", scope })), {
    content: "Diary body\n\n#diary",
    attachments: [],
  });
function OpenGlobal() {
  const { openEditor } = useGlobalMemoEditor();
  return (
    <button type="button" onClick={openEditor}>
      Open global
    </button>
  );
}

beforeAll(async () => {
  await preloadMemoEditing();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.clearAllMocks();
  instance.fetchSetting.mockResolvedValue(undefined);
  api.createMemo.mockImplementation(async ({ memo }: { memo: Memo }) => ({ ...memo, name: "memos/new" }));
  api.createMemoComment.mockImplementation(async ({ comment }: { comment: Memo }) => ({ ...comment, name: "memos/comment" }));
});
afterEach(() => {
  cacheService.clearAll();
  vi.useRealTimers();
});

describe("Diary date control through real editor focus boundaries", () => {
  it.each(["hosted", "inline"])("sets and edits an undated %s draft before saving its timestamps", async (mode) => {
    seedDraft(mode === "hosted" ? "global" : "date-focus");
    if (mode === "hosted") {
      mount(
        <GlobalMemoEditorProvider>
          <OpenGlobal />
        </GlobalMemoEditorProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Open global" }));
      await screen.findByRole("dialog", { name: "editor.new-memo" });
    } else {
      mount(<MemoEditor draft={{ scope: "date-focus" }} />);
      expect(setDateButton()).toHaveLength(1);
      await enterFocus();
    }
    expect(setDateButton()).toHaveLength(1);
    fireEvent.click(setDateButton()[0]);
    expect(setDateButton()).toHaveLength(0);
    expect(dateButton()).toHaveLength(1);
    fireEvent.click(dateButton()[0]);
    expect(screen.getByRole("textbox", { name: /^common\.created-at/ })).toHaveValue("2026-11-16 12:13:14");
    expect(screen.getByRole("textbox", { name: /^common\.last-updated-at/ })).toHaveValue("2026-11-16 12:13:14");
    fireEvent.change(screen.getByRole("textbox", { name: /^common\.created-at/ }), { target: { value: "2024-02-29 12:34:56" } });
    expect(screen.getByRole("textbox", { name: /^common\.last-updated-at/ })).toHaveValue("2026-11-16 12:13:14");
    fireEvent.change(screen.getByRole("textbox", { name: /^common\.last-updated-at/ }), { target: { value: "2024-03-01 13:35:57" } });
    await closeDate();
    if (mode === "inline") {
      fireEvent.click(screen.getByRole("button", { name: "editor.exit-focus-mode" }));
      expect(dateButton()).toHaveLength(1);
      expect(setDateButton()).toHaveLength(0);
      await enterFocus();
      expect(dateButton()).toHaveLength(1);
    }
    fireEvent.click(screen.getByRole("button", { name: "editor.save" }));
    await waitFor(() => expect(api.createMemo).toHaveBeenCalledOnce());
    expect(api.createMemo.mock.calls[0][0].memo).toMatchObject({
      content: "Diary body\n#diary",
      visibility: Visibility.PRIVATE,
      createTime: timestampFromDate(chosenCreate),
      updateTime: timestampFromDate(chosenUpdate),
    });
    if (mode === "hosted") await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps one calendar-seeded control in normal and inline focus mode", async () => {
    seedDraft("calendar-date");
    mount(<MemoEditor draft={{ scope: "calendar-date", createTime: now }} />);
    expect(dateButton()).toHaveLength(1);
    expect(setDateButton()).toHaveLength(0);
    await enterFocus();
    expect(dateButton()).toHaveLength(1);
    fireEvent.click(dateButton()[0]);
    expect(screen.getByRole("textbox", { name: /^common\.created-at/ })).toHaveValue("2026-11-16 12:13:14");
    expect(screen.getByRole("textbox", { name: /^common\.last-updated-at/ })).toHaveValue("2026-11-16 12:13:14");
    await closeDate();
    fireEvent.click(screen.getByRole("button", { name: "editor.exit-focus-mode" }));
    expect(dateButton()).toHaveLength(1);
  });

  it("keeps the existing memo's timestamp control without offering to seed dates", async () => {
    api.getMemo.mockResolvedValue(
      create(MemoSchema, {
        name: "memos/existing",
        creator: "users/1",
        content: "Existing",
        createTime: timestampFromDate(chosenCreate),
        updateTime: timestampFromDate(chosenUpdate),
      }),
    );
    mount(<MemoEditor mode="edit" name="memos/existing" />);
    await screen.findByRole("button", { name: "2024-02-29 12:34:56" });
    expect(dateButton()).toHaveLength(1);
    await enterFocus();
    expect(dateButton()).toHaveLength(1);
    expect(setDateButton()).toHaveLength(0);
    fireEvent.click(dateButton()[0]);
    expect(screen.getByRole("textbox", { name: /^common\.created-at/ })).toHaveValue("2024-02-29 12:34:56");
    expect(screen.getByRole("textbox", { name: /^common\.last-updated-at/ })).toHaveValue("2024-03-01 13:35:57");
  });

  it("does not offer a new comment independent diary dates in either mode", async () => {
    mount(<MemoEditor draft={{ parent: "memos/parent" }} />);
    expect(setDateButton()).toHaveLength(0);
    await enterFocus();
    expect(setDateButton()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /^\d{4}-\d{2}-\d{2} / })).not.toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "editor.exit-focus-mode" }));
    expect(setDateButton()).toHaveLength(0);
  });
});

describe("Diary file ingestion through the real editor", () => {
  const deferredPhoto = () => {
    const photo = new File(["img"], "diary.jpg", { type: "image/jpeg" });
    const read = Promise.withResolvers<ArrayBuffer>();
    const readFile = vi.spyOn(photo, "arrayBuffer").mockReturnValue(read.promise);
    return { photo, read, readFile };
  };

  it("blocks both save controls until the selected photo is in the draft, then uploads it once", async () => {
    seedDraft("pick-photo");
    const { container } = mount(<MemoEditor draft={{ scope: "pick-photo" }} />);
    const save = screen.getByRole("button", { name: "editor.save" });
    const input = container.querySelector<HTMLInputElement>('input[type="file"][accept=""]')!;
    const editor = container.querySelector<HTMLElement>(".memo-editor-root")!;
    const { photo, read, readFile } = deferredPhoto();
    const attachment = create(AttachmentSchema, { name: "attachments/photo", filename: photo.name, type: photo.type });
    attachmentApi.uploadAttachment
      .mockResolvedValueOnce({ uploadId: "photo", committedSize: 0n, maxChunkSize: 1024 })
      .mockResolvedValueOnce({ committedSize: 3n, attachment });

    fireEvent.change(input, { target: { files: [photo] } });
    expect(readFile).toHaveBeenCalledOnce();
    expect(save).toHaveAccessibleDescription("editor.validation.wait-for-upload");
    fireEvent.click(save);
    expect(showErrorToast).not.toHaveBeenCalled();
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter", ctrlKey: true });
    expect(showErrorToast).toHaveBeenCalledWith("editor.validation.wait-for-upload");
    expect(api.createMemo).not.toHaveBeenCalled();
    expect(attachmentApi.uploadAttachment).not.toHaveBeenCalled();

    await act(async () => read.resolve(new Uint8Array([1, 2, 3]).buffer));
    expect(save).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(save);
    await waitFor(() => expect(api.createMemo).toHaveBeenCalledOnce());
    expect(api.createMemo.mock.calls[0][0].memo.attachments).toMatchObject([{ name: attachment.name }]);
    expect(attachmentApi.uploadAttachment).toHaveBeenCalledTimes(2);
    expect(attachmentApi.uploadAttachment.mock.calls[0][0]).toMatchObject({
      upload: { case: "spec", value: { attachment: { filename: photo.name, type: photo.type } } },
    });
  });

  it.each(["paste", "drop"])("reports a second %s while the first file is still being read", async (gesture) => {
    seedDraft("paste-photo");
    const { container } = mount(<MemoEditor draft={{ scope: "paste-photo" }} />);
    const editor = container.querySelector<HTMLElement>(".memo-editor-root")!;
    const { photo, read, readFile } = deferredPhoto();
    const second = new File(["img"], "second.jpg", { type: "image/jpeg" });
    const paste = (file: File) => fireEvent.paste(editor, { clipboardData: { files: [file], getData: () => "" } });

    paste(photo);
    expect(readFile).toHaveBeenCalledOnce();
    if (gesture === "paste") {
      paste(second);
    } else {
      fireEvent.drop(editor, { dataTransfer: { files: [second], getData: () => "" } });
    }
    expect(showErrorToast).toHaveBeenCalledWith("editor.validation.wait-for-upload");
    await act(async () => read.resolve(new Uint8Array([1, 2, 3]).buffer));
    expect(screen.getAllByRole("button", { name: "common.preview-name" })).toHaveLength(1);
  });
});
