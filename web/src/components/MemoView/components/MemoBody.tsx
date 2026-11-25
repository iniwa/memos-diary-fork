import { Button } from "@usememos/ui";
import { EyeIcon } from "lucide-react";
import { useMemo } from "react";
import ClampedSection from "@/components/ClampedSection";
import { isDrawingFilename } from "@/components/DrawingSheet";
import { MemoEditor } from "@/components/MemoEditor/MemoEditor";
import { AttachmentGallery, MemoMetadataRows } from "@/components/MemoMetadata";
import { separateAttachments } from "@/components/MemoMetadata/Attachment/attachmentHelpers";
import { isReferenceRelation } from "@/components/MemoMetadata/Relation/relationHelpers";
import useCurrentUser from "@/hooks/useCurrentUser";
import { getVisibleDiaryTags } from "@/lib/diaryTags";
import { extractBoundaryTagLines } from "@/lib/tagLine";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";
import {
  canInlineAttachment,
  extractAttachmentUIDFromName,
  filterInlineManagedAttachments,
  removeManagedAttachmentReferences,
} from "@/utils/managed-attachment";
import { splitVisualAttachments } from "@/utils/media-item";
import { canManageMemo } from "@/utils/user";
import { useTagNavigation } from "../../MemoEditor/view/useTagNavigation";
import { MemoReactionListView } from "../../MemoReactionListView";
import { useMemoHandlers } from "../hooks";
import { useMemoViewContext } from "../MemoViewContext";
import type { MemoBodyProps } from "../types";
import InlineImageGrid from "./InlineImageGrid";
import { CreatorDisplay } from "./MemoHeader";

const BlurOverlay: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const t = useTranslate();
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <Button type="button" variant="neutral" size="sm" onClick={onClick} icon={<EyeIcon />}>
        {t("memo.click-to-show-sensitive-content")}
      </Button>
    </div>
  );
};

const MemoBody: React.FC<MemoBodyProps> = ({ compact, showCreator }) => {
  const {
    memo,
    creator,
    parentPage,
    showBlurredContent,
    blurred,
    readonly,
    isEditing,
    openEditor,
    closeEditor,
    onEditorFocusModeChange,
    openPreview,
    toggleBlurVisibility,
  } = useMemoViewContext();

  const { handleMemoContentClick, handleMemoContentDoubleClick } = useMemoHandlers({ readonly, openEditor, openPreview });

  const { body, tags } = useMemo(() => extractBoundaryTagLines(memo.content), [memo.content]);
  const navigateTag = useTagNavigation(parentPage);
  const visibleTags = useMemo(() => getVisibleDiaryTags(tags), [tags]);

  // Keep stored Markdown intact while grouping locally managed images in the diary grid.
  const displayBody = useMemo(() => {
    const gridUIDs = new Set(
      memo.attachments.filter(canInlineAttachment).flatMap((attachment) => {
        const uid = extractAttachmentUIDFromName(attachment.name);
        return uid ? [uid] : [];
      }),
    );
    return removeManagedAttachmentReferences(body, gridUIDs);
  }, [body, memo.attachments]);

  const referencedMemos = memo.relations.filter(isReferenceRelation);
  const hasText = displayBody.trim() !== "";
  const currentUser = useCurrentUser();
  // Memoized so AttachmentListView's own useMemo chain keeps its cache across body renders.
  const attachmentOnlyItems = useMemo(() => filterInlineManagedAttachments(displayBody, memo.attachments), [displayBody, memo.attachments]);
  const { inlineVisualItems, remainingAttachments } = useMemo(() => {
    const nonDrawings = attachmentOnlyItems.filter((attachment) => !isDrawingFilename(attachment.filename));
    const { inlineVisualItems, remainingAttachments } = splitVisualAttachments(nonDrawings);
    return {
      inlineVisualItems,
      remainingAttachments: attachmentOnlyItems.filter(
        (attachment) => isDrawingFilename(attachment.filename) || remainingAttachments.includes(attachment),
      ),
    };
  }, [attachmentOnlyItems]);
  const { visual, audio, docs } = useMemo(() => separateAttachments(remainingAttachments), [remainingAttachments]);

  // Editing takes the body's place inside the card's own frame: the session brings its
  // attachments, metadata and toolbar, so the read-only rows and reactions step aside.
  // Its timestamp row stands in for the header, leading with the creator when the
  // header would have shown one.
  if (isEditing) {
    return (
      <div data-slot="memo-body" className="w-full">
        <MemoEditor
          mode="edit"
          name={memo.name}
          frameless
          timestampLead={showCreator && creator ? <CreatorDisplay creator={creator} /> : undefined}
          autoFocus
          onConfirm={closeEditor}
          onCancel={closeEditor}
          onFocusModeChange={onEditorFocusModeChange}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col justify-start items-start gap-2">
      <div data-slot="memo-body" className="relative w-full">
        <div
          className={cn(
            "w-full flex flex-col justify-start items-start gap-2",
            blurred && !showBlurredContent && "blur-lg transition-all duration-200",
          )}
        >
          {/* Compact bounds the whole body — attachments included — behind one Show more.
              Reactions stay outside so they never hide under the fade. */}
          <ClampedSection enabled={Boolean(compact)}>
            {hasText && (
              <MemoEditor
                name={memo.name}
                parentPage={parentPage}
                displayContent={displayBody}
                compact={Boolean(compact)}
                onClick={handleMemoContentClick}
                onDoubleClick={handleMemoContentDoubleClick}
              />
            )}
            {visibleTags.length > 0 && (
              <div className="flex flex-row flex-wrap gap-1">
                {visibleTags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    data-tag={tag}
                    onClick={() => navigateTag(tag)}
                    className="rounded bg-mu-hover px-1.5 py-0.5 mu-caption text-mu-text-secondary hover:text-mu-text"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
            {inlineVisualItems.length > 0 && <InlineImageGrid items={inlineVisualItems} />}
            <AttachmentGallery
              visual={visual}
              onImagePreview={openPreview}
              drawings={{ memo, canEdit: !readonly && canManageMemo(memo, currentUser) }}
            />
            <MemoMetadataRows
              audio={audio}
              docs={docs}
              relations={referencedMemos}
              currentMemoName={memo.name}
              parentPage={parentPage}
              location={memo.location}
            />
          </ClampedSection>
        </div>

        {blurred && !showBlurredContent && <BlurOverlay onClick={toggleBlurVisibility} />}
      </div>

      <MemoReactionListView memo={memo} reactions={memo.reactions} />
    </div>
  );
};

export default MemoBody;
