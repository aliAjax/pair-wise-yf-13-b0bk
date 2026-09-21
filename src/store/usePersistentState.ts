import { useEffect, useState } from "react";

const STORAGE_KEY = "hxyfront-62001:bypass-desk:v1";

/**
 * 浏览器本地持久化：首次渲染从 localStorage 恢复，
 * 之后每次状态变更写回，刷新页面后数据保留。
 */
export function usePersistentState<T>(createInitial: () => T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // 本地数据损坏或不可用时回退到初始状态
    }
    return createInitial();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储被禁用（如隐私模式）时静默降级为内存态
    }
  }, [state]);

  return [state, setState] as const;
}
