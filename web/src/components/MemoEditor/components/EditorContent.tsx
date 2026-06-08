import { forwardRef } from "react";
import Editor, { type EditorRefActions } from "../Editor";
import { useBlobUrls, useDragAndDrop } from "../hooks";
import { useEditorContext } from "../state";
import type { EditorContentProps } from "../types";
import { createLocalFiles } from "../utils/localFile";

export const EditorContent = forwardRef<EditorRefActions, EditorContentProps>(({ placeholder }, ref) => {
  const { state, actions, dispatch } = useEditorContext();
  const { createBlobUrl } = useBlobUrls();

  const { dragHandlers } = useDragAndDrop((files: FileList) => {
    void createLocalFiles(files, createBlobUrl)
      .then((localFiles) => {
        localFiles.forEach((localFile) => dispatch(actions.addLocalFile(localFile)));
      })
      .catch((error) => {
        console.error("Failed to read dropped files:", error);
      });
  });

  const handleCompositionStart = () => {
    dispatch(actions.setComposing(true));
  };

  const handleCompositionEnd = () => {
    dispatch(actions.setComposing(false));
  };

  const handleContentChange = (content: string) => {
    dispatch(actions.updateContent(content));
  };

  const handlePaste = (event: React.ClipboardEvent<Element>) => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const files: File[] = [];
    if (clipboard.items && clipboard.items.length > 0) {
      for (const item of Array.from(clipboard.items)) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    } else if (clipboard.files && clipboard.files.length > 0) {
      files.push(...Array.from(clipboard.files));
    }

    if (files.length === 0) return;

    event.preventDefault();
    void createLocalFiles(files, createBlobUrl)
      .then((localFiles) => {
        localFiles.forEach((localFile) => dispatch(actions.addLocalFile(localFile)));
      })
      .catch((error) => {
        console.error("Failed to read pasted files:", error);
      });
  };

  return (
    <div className="w-full flex flex-col flex-1" {...dragHandlers}>
      <Editor
        ref={ref}
        className="memo-editor-content"
        initialContent={state.content}
        placeholder={placeholder || ""}
        isFocusMode={state.ui.isFocusMode}
        isInIME={state.ui.isComposing}
        onContentChange={handleContentChange}
        onPaste={handlePaste}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    </div>
  );
});

EditorContent.displayName = "EditorContent";
