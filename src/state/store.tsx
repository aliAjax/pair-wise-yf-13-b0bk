// 状态流转层：React store + 浏览器本地持久化（刷新后保留）

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from "react";
import type { ReactNode } from "react";
import type { AppState } from "../model/types";
import { createInitialState, reduce } from "./reducer";
import type { Action, DispatchResult } from "./reducer";

const STORAGE_KEY = "engine-bypass-permit-desk:v1";

function loadState(): AppState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return createInitialState();
        const parsed = JSON.parse(raw) as AppState;
        // 基本形状校验，损坏则回退种子数据
        if (
            !Array.isArray(parsed.equipment) ||
            !Array.isArray(parsed.readings) ||
            !Array.isArray(parsed.anomalies) ||
            !Array.isArray(parsed.permits) ||
            typeof parsed.currentShiftIndex !== "number"
        ) {
            return createInitialState();
        }
        return { ...createInitialState(), ...parsed, events: parsed.events ?? [] };
    } catch {
        return createInitialState();
    }
}

interface Store {
    state: AppState;
    dispatch: (action: Action) => DispatchResult;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [state, dispatchReducer] = useReducer(
        (prev: AppState, action: Action) => reduce(prev, action).state,
        undefined,
        loadState
    );

    // 持久化到浏览器本地
    const first = useRef(true);
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            first.current = false;
        } catch {
            // 存储不可用时静默降级为内存态
        }
    }, [state]);

    const dispatch = useCallback((action: Action): DispatchResult => {
        const result = reduce(state, action).result;
        if (result.accepted) {
            dispatchReducer(action);
        }
        return result;
    }, [state]);

    const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

    return (
        <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
    );
}

export function useStore(): Store {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error("useStore 必须在 StoreProvider 内使用");
    return ctx;
}
