import { useMemo } from "react";
import { AttachmentListView, LocationDisplayView, RelationListView } from "@/components/MemoMetadata";
import { extractTrailingTagLine } from "@/lib/tagLine";
import { cn } from "@/lib/utils";
import { MemoRelation_Type } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import { splitVisualAttachments } from "@/utils/media-item";
import MemoContent from "../../MemoContent";
import { Tag } from "../../MemoContent/Tag";
import { MemoReactionListView } from "../../MemoReactionListView";
import { useMemoHandlers } from "../hooks";
import { useMemoViewContext } from "../MemoViewContext";
import type { MemoBodyProps } from "../types";
import InlineImageGrid from "./InlineImageGrid";

const BlurOverlay: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const t = useTranslate();
  return (
    <div className="absolute inset-0 z-10 pt-4 flex items-center justify-center" onClick={onClick}>
      <button
        type="button"
        className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:bg-accent hover:text-foreground"
      >
        {t("memo.click-to-show-sensitive-content")}
      </button>
    </div>
  );
};

const getContentRevision = (content: string) => {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${content.length}-${hash >>> 0}`;
};

const MemoBody: React.FC<MemoBodyProps> = ({ compact }) => {
  const { memo, parentPage, showBlurredContent, blurred, readonly, openEditor, openPreview, toggleBlurVisibility } = useMemoViewContext();

  const { handleMemoContentClick, handleMemoContentDoubleClick } = useMemoHandlers({ readonly, openEditor, openPreview });

  const referencedMemos = memo.relations.filter((relation) => relation.type === MemoRelation_Type.REFERENCE);
  const contentRevision = useMemo(() => getContentRevision(memo.content), [memo.content]);
  const { body, tags } = useMemo(() => extractTrailingTagLine(memo.content), [memo.content]);

  const { inlineVisualItems, remainingAttachments } = useMemo(() => splitVisualAttachments(memo.attachments), [memo.attachments]);

  return (
    <>
      <div
        className={cn(
          "w-full flex flex-col justify-start items-start gap-2",
          blurred && !showBlurredContent && "blur-lg transition-all duration-200",
        )}
      >
        <MemoContent
          key={`${memo.name}-${contentRevision}`}
          content={body}
          onClick={handleMemoContentClick}
          onDoubleClick={handleMemoContentDoubleClick}
          compact={memo.pinned ? false : compact} // Always show full content when pinned
        />
        {tags.length > 0 && (
          <div className="flex flex-row flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Tag key={`${tag}-${index}`} data-tag={tag}>
                #{tag}
              </Tag>
            ))}
          </div>
        )}
        {inlineVisualItems.length > 0 && <InlineImageGrid items={inlineVisualItems} />}
        <AttachmentListView attachments={remainingAttachments} onImagePreview={openPreview} />
        <RelationListView relations={referencedMemos} currentMemoName={memo.name} parentPage={parentPage} />
        {memo.location && <LocationDisplayView location={memo.location} />}
        <MemoReactionListView memo={memo} reactions={memo.reactions} />
      </div>

      {blurred && !showBlurredContent && <BlurOverlay onClick={toggleBlurVisibility} />}
    </>
  );
};

export default MemoBody;
