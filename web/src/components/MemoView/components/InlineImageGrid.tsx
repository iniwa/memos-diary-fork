import type { FC } from "react";
import { useMemo } from "react";
import {
  COVER_MEDIA_CLASS,
  MEDIA_HOVER_GRADIENT_CLASS,
  MEDIA_HOVER_SURFACE_CLASS,
  NATURAL_MEDIA_CLASS,
  OVERFLOW_TILE_OVERLAY_CLASS,
  VISUAL_TILE_BUTTON_CLASS,
} from "@/components/MemoMetadata/Attachment/attachmentVisualClasses";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types/proto/api/v1/attachment_service_pb";
import type { AttachmentVisualItem, PreviewMediaItem } from "@/utils/media-item";
import { buildAttachmentVisualItems } from "@/utils/media-item";
import { useMemoViewContext } from "../MemoViewContext";

// ------------------------------------------------------------------
// Layout
// ------------------------------------------------------------------

const MAX_VISIBLE = 4;
const GRID_HEIGHT = "h-[11rem] sm:h-[14rem] md:h-[16rem]";

interface GridCell {
  item: AttachmentVisualItem;
  className?: string;
  overlayLabel?: string;
}

type GridLayout = { mode: "single"; item: AttachmentVisualItem } | { mode: "collage"; containerClassName: string; cells: GridCell[] };

function resolveImageGridLayout(items: AttachmentVisualItem[]): GridLayout | null {
  const count = items.length;
  if (count === 0) return null;

  if (count === 1) {
    return { mode: "single", item: items[0] };
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - MAX_VISIBLE;

  if (count === 2) {
    return {
      mode: "collage",
      containerClassName: cn("grid grid-cols-2 gap-1.5", GRID_HEIGHT),
      cells: visible.map((item) => ({ item })),
    };
  }

  if (count === 3) {
    return {
      mode: "collage",
      containerClassName: cn("grid grid-cols-2 grid-rows-2 gap-1.5", GRID_HEIGHT),
      cells: [{ item: visible[0], className: "row-span-2" }, { item: visible[1] }, { item: visible[2] }],
    };
  }

  // 4 or 5+: 2×2 grid, +N overlay on last visible cell
  return {
    mode: "collage",
    containerClassName: cn("grid grid-cols-2 grid-rows-2 gap-1.5", GRID_HEIGHT),
    cells: visible.map((item, i) => ({
      item,
      overlayLabel: i === MAX_VISIBLE - 1 && overflow > 0 ? `+${overflow}` : undefined,
    })),
  };
}

// ------------------------------------------------------------------
// Tile primitives
// ------------------------------------------------------------------

interface TileProps {
  className?: string;
  onClick?: () => void;
  overlayLabel?: string;
  children: React.ReactNode;
}

const Tile: FC<TileProps> = ({ className, onClick, overlayLabel, children }) => (
  <button type="button" className={cn(VISUAL_TILE_BUTTON_CLASS, className)} onClick={onClick}>
    <div className={MEDIA_HOVER_SURFACE_CLASS}>
      {children}
      <div className={MEDIA_HOVER_GRADIENT_CLASS} aria-hidden />
    </div>
    {overlayLabel && <div className={OVERFLOW_TILE_OVERLAY_CLASS}>{overlayLabel}</div>}
  </button>
);

const SingleTile: FC<{ item: AttachmentVisualItem; onClick?: () => void }> = ({ item, onClick }) => (
  <Tile className="inline-block max-w-full" onClick={onClick}>
    <img src={item.posterUrl} alt={item.filename} className={NATURAL_MEDIA_CLASS} loading="lazy" decoding="async" />
  </Tile>
);

const CollageTile: FC<{ item: AttachmentVisualItem; onClick?: () => void; className?: string; overlayLabel?: string }> = ({
  item,
  onClick,
  className,
  overlayLabel,
}) => (
  <Tile className={cn("block h-full w-full", className)} onClick={onClick} overlayLabel={overlayLabel}>
    <img src={item.posterUrl} alt={item.filename} className={COVER_MEDIA_CLASS} loading="lazy" decoding="async" />
  </Tile>
);

// ------------------------------------------------------------------
// Public component
// ------------------------------------------------------------------

interface InlineImageGridProps {
  /** Image-only attachments (pre-filtered by caller). */
  attachments: Attachment[];
}

const InlineImageGrid: FC<InlineImageGridProps> = ({ attachments }) => {
  const { openPreview } = useMemoViewContext();

  const items = useMemo(() => buildAttachmentVisualItems(attachments), [attachments]);
  const previewItems = useMemo<PreviewMediaItem[]>(() => items.map((i) => i.previewItem), [items]);
  const layout = useMemo(() => resolveImageGridLayout(items), [items]);

  if (!layout) return null;

  const handleClick = (itemId: string) => {
    const index = previewItems.findIndex((p) => p.id === itemId);
    openPreview(previewItems, index >= 0 ? index : 0);
  };

  if (layout.mode === "single") {
    return (
      <div className="w-full">
        <SingleTile item={layout.item} onClick={() => handleClick(layout.item.id)} />
      </div>
    );
  }

  return (
    <div className={layout.containerClassName}>
      {layout.cells.map(({ item, className, overlayLabel }) => (
        <CollageTile key={item.id} item={item} className={className} overlayLabel={overlayLabel} onClick={() => handleClick(item.id)} />
      ))}
    </div>
  );
};

export default InlineImageGrid;
