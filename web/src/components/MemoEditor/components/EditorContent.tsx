import { forwardRef } from "react";
import Editor from "../Editor";
import { useBlobUrls } from "../hooks";
import { useEditorContext, useEditorSelector } from "../state";
import type { EditorContentProps } from "../types";
import type { EditorController } from "../types/editorController";
import { createLocalFiles } from "../utils/localFile";

// Imported eagerly (not React.lazy): the editor is the always-present compose
// box on the home route, which is already code-split — so deferring the
// CodeMirror bundle separately bought nothing and made the editor paint empty
// for a beat before its placeholder appeared (a visible flicker on load).

/**
 * Hosts the CodeMirror Editor behind the EditorController contract. The
 * editor serializes into state.content on every change and exposes its
 * formatting capability for the focus-mode toolbar.
 */
export const EditorContent = forwardRef<EditorController, EditorContentProps>(({ placeholder, onSubmit }, ref) => {
  const { actions, dispatch } = useEditorContext();
  const { createBlobUrl } = useBlobUrls();
  const content = useEditorSelector((s) => s.content);
  const isFocusMode = useEditorSelector((s) => s.ui.isFocusMode);

  // Diary Mode: read the dropped/pasted files sequentially into snapshots
  // before they reach the store, so bulk image uploads stay stable.
  const handleFiles = (files: File[]) => {
    void createLocalFiles(files, createBlobUrl)
      .then((localFiles) => {
        localFiles.forEach((localFile) => dispatch(actions.addLocalFile(localFile)));
      })
      .catch((error) => {
        console.error("Failed to read files:", error);
      });
  };

  const handleContentChange = (content: string) => {
    dispatch(actions.updateContent(content));
  };

  return (
    <div className="w-full flex flex-col flex-1">
      <Editor
        ref={ref}
        className="memo-editor-content"
        initialContent={content}
        placeholder={placeholder || ""}
        isFocusMode={isFocusMode}
        onContentChange={handleContentChange}
        onFiles={handleFiles}
        onSubmit={onSubmit}
      />
    </div>
  );
});

EditorContent.displayName = "EditorContent";
