import type { FC } from "react";
import { useTranslate } from "@/utils/i18n";
import { useEditorContext, useEditorSelector } from "../state";
import { TimestampPopover } from "./TimestampPopover";

export const DiaryDateControl: FC = () => {
  const t = useTranslate();
  const { actions, dispatch } = useEditorContext();
  const hasCreateTime = useEditorSelector((s) => Boolean(s.timestamps.createTime));

  if (hasCreateTime) {
    return <TimestampPopover />;
  }

  return (
    <button
      type="button"
      className="mu-caption text-mu-text-secondary/60 hover:text-mu-text-secondary transition-colors cursor-pointer"
      onClick={() => {
        const now = new Date();
        dispatch(actions.setTimestamps({ createTime: now, updateTime: now }));
      }}
    >
      {t("editor.diary-date-control.set-date")}
    </button>
  );
};
