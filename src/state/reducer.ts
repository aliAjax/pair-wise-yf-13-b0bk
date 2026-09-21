// 状态流转层：reducer —— 校验通过才原子提交，拒绝时返回原状态

import type { AppState, EquipmentCategory, HistoryEvent } from "../model/types";
import {
    buildAnomaly,
    buildEvent,
    buildPermit,
    buildReading,
    buildRenewal,
    findEquipment,
    validateAnomaly,
    validateIssue,
    validateReading,
    validateRenew,
} from "./transitions";
import type { IssueInput, RenewInput } from "./transitions";

export type Action =
    | {
          type: "register-reading";
          equipmentId: string;
          param: string;
          value: string;
      }
    | {
          type: "register-anomaly";
          equipmentId: string;
          description: string;
      }
    | { type: "resolve-anomaly"; anomalyId: string }
    | { type: "issue-permit"; input: IssueInput }
    | { type: "renew-permit"; input: RenewInput }
    | { type: "close-permit"; permitId: string; note: string }
    | { type: "set-shift"; shiftIndex: number }
    | {
          type: "set-filter";
          filter: EquipmentCategory | "全部";
      }
    | { type: "reset" };

export type DispatchResult =
    | { accepted: true; eventText?: string }
    | { accepted: false; error: string };

function withEvent(
    state: AppState,
    event: HistoryEvent
): { state: AppState; event: HistoryEvent } {
    return {
        state: { ...state, events: [event, ...state.events] },
        event,
    };
}

/** 处理动作；不合法时返回原 state 与拒绝原因 */
export function reduce(
    state: AppState,
    action: Action
): { state: AppState; result: DispatchResult } {
    switch (action.type) {
        case "register-reading": {
            const v = validateReading(state, action);
            if (!v.ok) return { state, result: { accepted: false, error: v.error } };
            const reading = buildReading(state, action);
            const equipment = findEquipment(state, action.equipmentId)!;
            const r = withEvent(
                { ...state, readings: [reading, ...state.readings] },
                buildEvent(
                    "reading",
                    equipment.id,
                    state.currentShiftIndex,
                    `登记 ${equipment.name} ${reading.param} = ${reading.value}`
                )
            );
            return {
                state: r.state,
                result: { accepted: true, eventText: r.event.text },
            };
        }

        case "register-anomaly": {
            const v = validateAnomaly(action);
            if (!v.ok) return { state, result: { accepted: false, error: v.error } };
            const anomaly = buildAnomaly(state, action);
            const equipment = findEquipment(state, action.equipmentId)!;
            const r = withEvent(
                { ...state, anomalies: [anomaly, ...state.anomalies] },
                buildEvent(
                    "anomaly",
                    equipment.id,
                    state.currentShiftIndex,
                    `上报异常：${equipment.name} — ${anomaly.description}`
                )
            );
            return {
                state: r.state,
                result: { accepted: true, eventText: r.event.text },
            };
        }

        case "resolve-anomaly": {
            const anomaly = state.anomalies.find(
                (a) => a.id === action.anomalyId && a.status === "open"
            );
            if (!anomaly)
                return {
                    state,
                    result: { accepted: false, error: "异常不存在或已处理" },
                };
            const anomalies = state.anomalies.map((a) =>
                a.id === anomaly.id
                    ? {
                          ...a,
                          status: "resolved" as const,
                          resolvedAt: new Date().toISOString(),
                      }
                    : a
            );
            const equipment = findEquipment(state, anomaly.equipmentId)!;
            const r = withEvent(
                { ...state, anomalies },
                buildEvent(
                    "anomaly-resolved",
                    equipment.id,
                    state.currentShiftIndex,
                    `异常已处理：${equipment.name} — ${anomaly.description}`
                )
            );
            return {
                state: r.state,
                result: { accepted: true, eventText: r.event.text },
            };
        }

        case "issue-permit": {
            const v = validateIssue(state, action.input);
            if (!v.ok) return { state, result: { accepted: false, error: v.error } };
            const permit = buildPermit(state, action.input);
            const equipment = findEquipment(state, permit.equipmentId)!;
            const r = withEvent(
                { ...state, permits: [permit, ...state.permits] },
                buildEvent(
                    "permit-issued",
                    equipment.id,
                    state.currentShiftIndex,
                    `签发旁路许可：${equipment.name}｜原因 ${permit.reason}｜责任人 ${permit.owner}｜到期 ${permit.expireShiftIndex}`
                )
            );
            return {
                state: r.state,
                result: { accepted: true, eventText: r.event.text },
            };
        }

        case "renew-permit": {
            const v = validateRenew(state, action.input);
            if (!v.ok) return { state, result: { accepted: false, error: v.error } };
            const oldPermit = state.permits.find(
                (p) => p.id === action.input.permitId
            )!;
            const renewal = buildRenewal(state, oldPermit, action.input);
            const permits = state.permits.map((p) =>
                p.id === oldPermit.id
                    ? {
                          ...p,
                          expireShiftIndex: action.input.expireShiftIndex,
                          renewals: [renewal, ...p.renewals],
                      }
                    : p
            );
            const equipment = findEquipment(state, oldPermit.equipmentId)!;
            const r = withEvent(
                { ...state, permits },
                buildEvent(
                    "permit-renewed",
                    equipment.id,
                    state.currentShiftIndex,
                    `续期旁路许可：${equipment.name}｜复测值 ${renewal.retestValue}｜到期 ${renewal.toExpireShift}`
                )
            );
            return {
                state: r.state,
                result: { accepted: true, eventText: r.event.text },
            };
        }

        case "close-permit": {
            const permit = state.permits.find((p) => p.id === action.permitId);
            if (!permit || permit.closed)
                return {
                    state,
                    result: { accepted: false, error: "许可不存在或已关闭" },
                };
            const permits = state.permits.map((p) =>
                p.id === permit.id
                    ? {
                          ...p,
                          closed: true,
                          closedAt: new Date().toISOString(),
                          closeNote: action.note.trim() || undefined,
                      }
                    : p
            );
            const equipment = findEquipment(state, permit.equipmentId)!;
            const r = withEvent(
                { ...state, permits },
                buildEvent(
                    "permit-closed",
                    equipment.id,
                    state.currentShiftIndex,
                    `关闭旁路许可：${equipment.name}｜恢复正常监视`
                )
            );
            return {
                state: r.state,
                result: { accepted: true, eventText: r.event.text },
            };
        }

        case "set-shift": {
            if (
                !Number.isInteger(action.shiftIndex) ||
                action.shiftIndex < 0
            ) {
                return { state, result: { accepted: false, error: "班次无效" } };
            }
            return {
                state: { ...state, currentShiftIndex: action.shiftIndex },
                result: { accepted: true },
            };
        }

        case "set-filter":
            return {
                state: { ...state, filter: action.filter },
                result: { accepted: true },
            };

        case "reset":
            return {
                state: createInitialState(),
                result: { accepted: true },
            };

        default:
            return { state, result: { accepted: false, error: "未知操作" } };
    }
}

// ---------- 初始 / 种子数据 ----------

export function createInitialState(): AppState {
    const equipment = [
        { id: "eq-main", name: "主机", category: "主机" as const },
        { id: "eq-gen1", name: "发电机#1", category: "发电机" as const },
        { id: "eq-gen2", name: "发电机#2", category: "发电机" as const },
        { id: "eq-pump-lo", name: "滑油泵#1", category: "泵组" as const },
        { id: "eq-pump-cw", name: "冷却水泵#2", category: "泵组" as const },
    ];

    // 以当前班次 16-20班（索引 4）为锚点构造演示数据
    const currentShiftIndex = 4;
    const isoMinus = (mins: number) =>
        new Date(Date.now() - mins * 60_000).toISOString();

    const readings = [
        {
            id: "rd-seed-1",
            equipmentId: "eq-main",
            param: "主机转速",
            value: "82 rpm",
            shiftIndex: 3,
            createdAt: isoMinus(200),
        },
        {
            id: "rd-seed-2",
            equipmentId: "eq-main",
            param: "滑油压力",
            value: "0.42 MPa",
            shiftIndex: 4,
            createdAt: isoMinus(60),
        },
        {
            id: "rd-seed-3",
            equipmentId: "eq-gen1",
            param: "冷却水温",
            value: "76 ℃",
            shiftIndex: 4,
            createdAt: isoMinus(40),
        },
        {
            id: "rd-seed-4",
            equipmentId: "eq-gen2",
            param: "燃油消耗",
            value: "32 L/h",
            shiftIndex: 3,
            createdAt: isoMinus(180),
        },
    ];

    const anomalies = [
        {
            id: "an-seed-1",
            equipmentId: "eq-gen2",
            description: "冷却水温偏高，安排复查",
            shiftIndex: 3,
            status: "open" as const,
            createdAt: isoMinus(170),
        },
        {
            id: "an-seed-2",
            equipmentId: "eq-pump-cw",
            description: "轴封渗漏，转旁通管路运行",
            shiftIndex: 2,
            status: "open" as const,
            createdAt: isoMinus(400),
        },
        {
            id: "an-seed-3",
            equipmentId: "eq-main",
            description: "排温传感器瞬时报警，复检正常",
            shiftIndex: 1,
            status: "resolved" as const,
            createdAt: isoMinus(900),
            resolvedAt: isoMinus(820),
        },
    ];

    // 主机：一条有效许可（当前班次 4，到期班次 5）
    // 冷却水泵#2：一条已到期许可（到期班次 3），设备处于锁定
    const permits = [
        {
            id: "bp-seed-1",
            equipmentId: "eq-main",
            anomalyId: "an-seed-3",
            reason: "排温传感器校验中，暂时旁路报警，人工每小时测记",
            owner: "李轮机",
            issueShiftIndex: 3,
            expireShiftIndex: 5,
            baselineValue: "排温 412 ℃",
            renewals: [],
            closed: false,
            createdAt: isoMinus(220),
        },
        {
            id: "bp-seed-2",
            equipmentId: "eq-pump-cw",
            anomalyId: "an-seed-2",
            reason: "轴封渗漏待备件，旁通管路维持冷却水供应",
            owner: "王机工",
            issueShiftIndex: 2,
            expireShiftIndex: 3,
            baselineValue: "出口压力 0.28 MPa",
            renewals: [],
            closed: false,
            createdAt: isoMinus(420),
        },
    ];

    const events: HistoryEvent[] = [
        {
            id: "ev-seed-1",
            kind: "reading",
            equipmentId: "eq-gen1",
            shiftIndex: 4,
            text: "登记 发电机#1 冷却水温 = 76 ℃",
            at: isoMinus(40),
        },
        {
            id: "ev-seed-2",
            kind: "permit-issued",
            equipmentId: "eq-main",
            shiftIndex: 3,
            text: "签发旁路许可：主机｜原因 排温传感器校验中｜责任人 李轮机｜到期 5",
            at: isoMinus(220),
        },
        {
            id: "ev-seed-3",
            kind: "permit-issued",
            equipmentId: "eq-pump-cw",
            shiftIndex: 2,
            text: "签发旁路许可：冷却水泵#2｜原因 轴封渗漏待备件｜责任人 王机工｜到期 3",
            at: isoMinus(420),
        },
    ];

    return {
        equipment,
        readings,
        anomalies,
        permits,
        events,
        currentShiftIndex,
        filter: "全部",
    };
}
