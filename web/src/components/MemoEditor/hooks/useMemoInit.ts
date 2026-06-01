import { useEffect, useRef, useState } from "react";
import { extractBoundaryTagLines } from "@/lib/tagLine";
import type { Memo, Visibility } from "@/types/proto/api/v1/memo_service_pb";
import type { EditorRefActions } from "../Editor";
import { cacheService, memoService } from "../services";
import { useEditorContext } from "../state";

interface UseMemoInitOptions {
  editorRef: React.RefObject<EditorRefActions | null>;
  memo?: Memo;
  cacheKey?: string;
  username: string;
  autoFocus?: boolean;
  defaultVisibility?: Visibility;
  defaultCreateTime?: Date;
}

export const useMemoInit = ({
  editorRef,
  memo,
  cacheKey,
  username,
  autoFocus,
  defaultVisibility,
  defaultCreateTime,
}: UseMemoInitOptions) => {
  const { actions, dispatch } = useEditorContext();
  const initializedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const key = cacheService.key(username, cacheKey);

    if (memo) {
      const initialState = memoService.fromMemo(memo);
      cacheService.clear(key);
      dispatch(actions.initMemo(initialState));
      dispatch(actions.setTags(initialState.tags));
    } else {
      const cachedContent = cacheService.load(key);
      if (cachedContent) {
        const { body, tags } = extractBoundaryTagLines(cachedContent);
        dispatch(actions.updateContent(body));
        if (tags.length) dispatch(actions.setTags(tags));
      }
      if (defaultVisibility !== undefined) {
        dispatch(actions.setMetadata({ visibility: defaultVisibility }));
      }
      if (defaultCreateTime) {
        dispatch(actions.setTimestamps({ createTime: defaultCreateTime, updateTime: defaultCreateTime }));
      }
    }

    if (autoFocus) {
      setTimeout(() => editorRef.current?.focus(), 100);
    }

    setIsInitialized(true);
  }, [memo, cacheKey, username, autoFocus, defaultVisibility, defaultCreateTime, actions, dispatch, editorRef]);

  return { isInitialized };
};
