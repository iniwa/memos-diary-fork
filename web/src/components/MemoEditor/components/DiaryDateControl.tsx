import type { FC } from "react";
import { useTranslate } from "@/utils/i18n";
import { useEditorContext } from "../state";
import { TimestampPopover } from "./TimestampPopover";

export const DiaryDateControl: FC = () => {
  const t = useTranslate();
  const { state, actions, dispatch } = useEditorContext();

  if (state.timestamps.createTime) {
    return <TimestampPopover />;
  }

  return (
    <button
      type="button"
      className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
      onClick={() => {
        const now = new Date();
        dispatch(actions.setTimestamps({ createTime: now, updateTime: now }));
      }}
    >
      {t("editor.diary-date-control.set-date")}
    </button>
  );
};
