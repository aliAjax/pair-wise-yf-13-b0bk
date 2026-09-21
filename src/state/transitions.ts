// 状态流转层：旁路许可的校验规则与状态机
// 所有变更先经纯函数 validate，通过后再由 reducer 原子提交；
// 任一条不满足则整次拒绝——原参数与许可不变。

import type {
    Anomaly,
    AppState,
    BypassPermit,
    Equipment,
    HistoryEvent,
    Reading,
    Renewal,
} from "../model/types";
import { SHIFTS } from "../model/types";

export type Ok = { ok: true };
export type Reject = { ok: false; error: string };
export type Validation = Ok | Reject;

export interface IssueInput {
    equipmentId: string;
    reason: string;
    owner: string;
    expireShiftIndex: number;
    baselineValue: string;
}

export interface RenewInput {
    permitId: string;
    retestValue: string;
    expireShiftIndex: number;
}

// ---------- 派生状态 ----------

/** 许可当前状态：未关闭且未过到期班次为 active；到期为 expired；关闭为 closed */
export function permitStatus(
    permit: BypassPermit,
    currentShiftIndex: number
): "active" | "expired" | "closed" {
    if (permit.closed) return "closed";
    return currentShiftIndex <= permit.expireShiftIndex ? "active" : "expired";
}

export function activePermitFor(
    state: Pick<AppState, "permits">,
    equipmentId: string,
    currentShiftIndex: number
): BypassPermit | undefined {
    return state.permits.find(
        (p) =>
            p.equipmentId === equipmentId &&
            permitStatus(p, currentShiftIndex) === "active"
    );
}

/** 设备是否存在"到期未续"许可（即上一条许可已 expired 且没有新的 active 许可） */
export function isEquipmentLocked(
    state: Pick<AppState, "permits">,
    equipmentId: string,
    currentShiftIndex: number
): boolean {
    const permits = state.permits.filter((p) => p.equipmentId === equipmentId);
    return (
        permits.some((p) => permitStatus(p, currentShiftIndex) === "expired") &&
        !permits.some((p) => permitStatus(p, currentShiftIndex) === "active")
    );
}

export function findEquipment(
    state: Pick<AppState, "equipment">,
    equipmentId: string
): Equipment | undefined {
    return state.equipment.find((e) => e.id === equipmentId);
}

export function findPermit(
    state: Pick<AppState, "permits">,
    permitId: string
): BypassPermit | undefined {
    return state.permits.find((p) => p.id === permitId);
}

// ---------- 签发校验 ----------
// 拒绝条件：
// 1) 缺原因 / 责任人 / 到期班次；
// 2) 该设备已有一条有效许可；
// 3) 该设备没有未处理异常。

export function validateIssue(
    state: AppState,
    input: Partial<IssueInput>
): Validation {
    const equipment =
        input.equipmentId != null
            ? findEquipment(state, input.equipmentId)
            : undefined;
    if (!equipment) return { ok: false, error: "请选择要旁路的设备" };

    const reason = input.reason?.trim() ?? "";
    if (!reason) return { ok: false, error: "旁路原因为必填项，整次登记已拒绝" };

    const owner = input.owner?.trim() ?? "";
    if (!owner) return { ok: false, error: "责任人为必填项，整次登记已拒绝" };

    if (
        input.expireShiftIndex == null ||
        Number.isNaN(input.expireShiftIndex)
    ) {
        return { ok: false, error: "到期班次为必填项，整次登记已拒绝" };
    }
    if (input.expireShiftIndex < state.currentShiftIndex) {
        return {
            ok: false,
            error: "到期班次不能早于当前班次，整次登记已拒绝",
        };
    }

    if (activePermitFor(state, equipment.id, state.currentShiftIndex)) {
        return {
            ok: false,
            error: `设备「${equipment.name}」已有有效旁路许可，同一设备最多一条，整次登记已拒绝`,
        };
    }

    const hasOpenAnomaly = state.anomalies.some(
        (a) => a.equipmentId === equipment.id && a.status === "open"
    );
    if (!hasOpenAnomaly) {
        return {
            ok: false,
            error: `设备「${equipment.name}」没有未处理异常，不允许登记旁路，整次登记已拒绝`,
        };
    }

    return { ok: true };
}

// ---------- 续期校验 ----------
// 到期后设备锁定；续期须补录复测值，否则锁定不变。

export function validateRenew(
    state: AppState,
    input: Partial<RenewInput>
): Validation {
    const permit =
        input.permitId != null ? findPermit(state, input.permitId) : undefined;
    if (!permit) return { ok: false, error: "未找到对应旁路许可，续期已拒绝" };

    if (permit.closed)
        return { ok: false, error: "该许可已关闭，不能续期" };

    const retest = input.retestValue?.trim() ?? "";
    if (!retest) {
        return {
            ok: false,
            error: "续期必须补录复测值，未补录前设备保持锁定",
        };
    }

    if (
        input.expireShiftIndex == null ||
        Number.isNaN(input.expireShiftIndex)
    ) {
        return { ok: false, error: "请选择新的到期班次，续期已拒绝" };
    }
    if (input.expireShiftIndex < state.currentShiftIndex) {
        return {
            ok: false,
            error: "新到期班次不能早于当前班次，续期已拒绝",
        };
    }

    return { ok: true };
}

// ---------- 读数登记校验：到期锁定设备禁止登记读数 ----------

export function validateReading(
    state: AppState,
    input: { equipmentId?: string; param?: string; value?: string }
): Validation {
    const equipment = input.equipmentId
        ? findEquipment(state, input.equipmentId)
        : undefined;
    if (!equipment) return { ok: false, error: "请选择设备" };
    if (!input.param?.trim()) return { ok: false, error: "请填写参数名称" };
    if (!input.value?.trim()) return { ok: false, error: "请填写参数读数" };

    if (isEquipmentLocked(state, equipment.id, state.currentShiftIndex)) {
        return {
            ok: false,
            error: `设备「${equipment.name}」旁路已到期且未续期，读数登记已锁定；补录复测值续期后解锁`,
        };
    }
    return { ok: true };
}

export function validateAnomaly(input: {
    equipmentId?: string;
    description?: string;
}): Validation {
    if (!input.equipmentId) return { ok: false, error: "请选择设备" };
    if (!input.description?.trim())
        return { ok: false, error: "请填写异常描述" };
    return { ok: true };
}

// ---------- 工具 ----------

let seq = 0;
export function uid(prefix: string): string {
    seq += 1;
    const rand =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${seq}-${rand}`;
}

export function nowIso(): string {
    return new Date().toISOString();
}

export function buildReading(
    state: AppState,
    input: { equipmentId: string; param: string; value: string }
): Reading {
    return {
        id: uid("rd"),
        equipmentId: input.equipmentId,
        param: input.param.trim(),
        value: input.value.trim(),
        shiftIndex: state.currentShiftIndex,
        createdAt: nowIso(),
    };
}

export function buildAnomaly(
    state: AppState,
    input: { equipmentId: string; description: string }
): Anomaly {
    return {
        id: uid("an"),
        equipmentId: input.equipmentId,
        description: input.description.trim(),
        shiftIndex: state.currentShiftIndex,
        status: "open",
        createdAt: nowIso(),
    };
}

export function buildPermit(state: AppState, input: IssueInput): BypassPermit {
    const anomaly = state.anomalies.find(
        (a) => a.equipmentId === input.equipmentId && a.status === "open"
    );
    return {
        id: uid("bp"),
        equipmentId: input.equipmentId,
        anomalyId: anomaly!.id,
        reason: input.reason.trim(),
        owner: input.owner.trim(),
        issueShiftIndex: state.currentShiftIndex,
        expireShiftIndex: input.expireShiftIndex,
        baselineValue: input.baselineValue.trim(),
        renewals: [],
        closed: false,
        createdAt: nowIso(),
    };
}

export function buildRenewal(
    state: AppState,
    permit: BypassPermit,
    input: RenewInput
): Renewal {
    return {
        retestValue: input.retestValue.trim(),
        fromExpireShift: permit.expireShiftIndex,
        toExpireShift: input.expireShiftIndex,
        shiftIndex: state.currentShiftIndex,
        at: nowIso(),
    };
}

export function buildEvent(
    kind: HistoryEvent["kind"],
    equipmentId: string,
    shiftIndex: number,
    text: string
): HistoryEvent {
    return { id: uid("ev"), kind, equipmentId, shiftIndex, text, at: nowIso() };
}

export { SHIFTS };
