// 状态流转层：派生选择器（看板、筛选、交接摘要）

import type {
    AppState,
    BypassPermit,
    Equipment,
    EquipmentCategory,
    HistoryEvent,
    PermitStatus,
} from "../model/types";
import {
    activePermitFor,
    isEquipmentLocked,
    permitStatus,
} from "./transitions";

export interface EquipmentView {
    equipment: Equipment;
    locked: boolean;
    activePermit?: BypassPermit;
    openAnomalyCount: number;
}

export function equipmentName(state: AppState, id: string): string {
    return state.equipment.find((e) => e.id === id)?.name ?? id;
}

export function equipmentViews(state: AppState): EquipmentView[] {
    return state.equipment.map((equipment) => ({
        equipment,
        locked: isEquipmentLocked(state, equipment.id, state.currentShiftIndex),
        activePermit: activePermitFor(state, equipment.id, state.currentShiftIndex),
        openAnomalyCount: state.anomalies.filter(
            (a) => a.equipmentId === equipment.id && a.status === "open"
        ).length,
    }));
}

export function filteredEquipment(state: AppState): EquipmentView[] {
    const views = equipmentViews(state);
    if (state.filter === "全部") return views;
    return views.filter((v) => v.equipment.category === state.filter);
}

/** 各分类下处于锁定状态的设备数，用于筛选 chips 标红 */
export function lockCountsByCategory(
    state: AppState
): Record<EquipmentCategory, number> {
    const counts: Record<EquipmentCategory, number> = {
        主机: 0,
        发电机: 0,
        泵组: 0,
    };
    for (const v of equipmentViews(state)) {
        if (v.locked) counts[v.equipment.category] += 1;
    }
    return counts;
}

export interface BoardMetrics {
    activePermits: number;
    locked: number;
    openAnomalies: number;
    readings: number;
}

export function boardMetrics(state: AppState): BoardMetrics {
    return {
        activePermits: state.permits.filter(
            (p) => permitStatus(p, state.currentShiftIndex) === "active"
        ).length,
        locked: equipmentViews(state).filter((v) => v.locked).length,
        openAnomalies: state.anomalies.filter((a) => a.status === "open").length,
        readings: state.readings.filter(
            (r) => r.shiftIndex === state.currentShiftIndex
        ).length,
    };
}

export interface PermitView {
    permit: BypassPermit;
    status: PermitStatus;
    equipment: Equipment;
}

export function permitViews(state: AppState): PermitView[] {
    return state.permits
        .map((permit) => ({
            permit,
            status: permitStatus(permit, state.currentShiftIndex),
            equipment: state.equipment.find(
                (e) => e.id === permit.equipmentId
            )!,
        }))
        .filter(Boolean)
        .sort((a, b) => {
            const rank = { active: 0, expired: 1, closed: 2 } as const;
            if (rank[a.status] !== rank[b.status])
                return rank[a.status] - rank[b.status];
            return b.permit.createdAt.localeCompare(a.permit.createdAt);
        });
}

export function filteredPermits(state: AppState): PermitView[] {
    const views = permitViews(state);
    if (state.filter === "全部") return views;
    return views.filter((v) => v.equipment.category === state.filter);
}

export function filteredEvents(state: AppState): HistoryEvent[] {
    if (state.filter === "全部") return state.events;
    const ids = new Set(
        state.equipment
            .filter((e) => e.category === state.filter)
            .map((e) => e.id)
    );
    return state.events.filter((ev) => ids.has(ev.equipmentId));
}

// ---------- 交接班摘要 ----------

export interface HandoverData {
    shiftIndex: number;
    locked: EquipmentView[];
    activePermits: PermitView[];
    openAnomalies: AppState["anomalies"];
    readingsThisShift: AppState["readings"];
}

export function handoverData(state: AppState): HandoverData {
    return {
        shiftIndex: state.currentShiftIndex,
        locked: equipmentViews(state).filter((v) => v.locked),
        activePermits: permitViews(state).filter((v) => v.status === "active"),
        openAnomalies: state.anomalies.filter((a) => a.status === "open"),
        readingsThisShift: state.readings.filter(
            (r) => r.shiftIndex === state.currentShiftIndex
        ),
    };
}
