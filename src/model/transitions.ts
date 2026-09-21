/**
 * 临时旁路许可台 —— 状态流转
 *
 * 所有流转都是纯函数：校验失败时返回 { ok: false, error }，
 * 调用方保持原状态不变（整次拒绝，原参数与许可不变）；
 * 校验通过时返回替换后的新状态，不做原地修改。
 */

import {
  Anomaly,
  DeskState,
  EQUIPMENT,
  Permit,
  Reading,
  SHIFTS,
} from "./types";

export type PermitStatus = "有效" | "已到期";

export type Transition =
  | { ok: true; state: DeskState }
  | { ok: false; error: string };

const fail = (error: string): Transition => ({ ok: false, error });

/* ---------------- 派生状态（选择器） ---------------- */

export function permitStatus(permit: Permit, currentShift: number): PermitStatus {
  return currentShift < permit.expiryShift ? "有效" : "已到期";
}

/** 设备当前的有效许可（同一设备最多一条） */
export function activePermitFor(
  state: DeskState,
  equipmentId: string
): Permit | undefined {
  return state.permits.find(
    (p) => p.equipmentId === equipmentId && permitStatus(p, state.currentShift) === "有效"
  );
}

/** 设备已到期、尚未续期的许可 */
export function expiredPermitFor(
  state: DeskState,
  equipmentId: string
): Permit | undefined {
  return state.permits.find(
    (p) => p.equipmentId === equipmentId && permitStatus(p, state.currentShift) === "已到期"
  );
}

/** 许可到期后设备锁定读数登记，续期补录复测值前锁定不变 */
export function isEquipmentLocked(state: DeskState, equipmentId: string): boolean {
  return expiredPermitFor(state, equipmentId) !== undefined;
}

export function unhandledAnomaliesFor(state: DeskState, equipmentId: string): Anomaly[] {
  return state.anomalies.filter((a) => a.equipmentId === equipmentId && !a.handled);
}

export function equipmentName(equipmentId: string): string {
  return EQUIPMENT.find((e) => e.id === equipmentId)?.name ?? equipmentId;
}

export function shiftName(shift: number): string {
  return SHIFTS[shift] ?? `#${shift}`;
}

/* ---------------- 状态流转 ---------------- */

export interface PermitInput {
  equipmentId: string;
  reason: string;
  owner: string;
  /** 未选择时传 null */
  expiryShift: number | null;
}

/**
 * 登记旁路许可。以下任一条件不满足即整次拒绝，原参数与许可不变：
 * 缺旁路原因 / 缺责任人 / 缺到期班次 / 到期班次不晚于当前班次 /
 * 该设备已有有效许可 / 该设备许可已到期未续期 / 该设备没有未处理异常。
 */
export function registerPermit(state: DeskState, input: PermitInput): Transition {
  const equipment = EQUIPMENT.find((e) => e.id === input.equipmentId);
  if (!equipment) return fail("登记被拒绝：设备不存在，原参数与许可不变。");

  const reason = input.reason.trim();
  const owner = input.owner.trim();
  if (!reason) return fail("登记被拒绝：缺少旁路原因，原参数与许可不变。");
  if (!owner) return fail("登记被拒绝：缺少责任人，原参数与许可不变。");
  if (input.expiryShift === null || !Number.isInteger(input.expiryShift)) {
    return fail("登记被拒绝：缺少到期班次，原参数与许可不变。");
  }
  if (input.expiryShift <= state.currentShift || input.expiryShift >= SHIFTS.length) {
    return fail("登记被拒绝：到期班次必须晚于当前班次，原参数与许可不变。");
  }
  if (activePermitFor(state, equipment.id)) {
    return fail(`登记被拒绝：${equipment.name}已有有效许可，同一设备最多一条有效许可。`);
  }
  if (expiredPermitFor(state, equipment.id)) {
    return fail(`登记被拒绝：${equipment.name}的许可已到期，请办理续期并补录复测值。`);
  }
  if (unhandledAnomaliesFor(state, equipment.id).length === 0) {
    return fail(`登记被拒绝：${equipment.name}没有未处理异常，不能登记旁路。`);
  }

  const permit: Permit = {
    id: `permit-${state.seq + 1}`,
    equipmentId: equipment.id,
    reason,
    owner,
    createdShift: state.currentShift,
    expiryShift: input.expiryShift,
    renewals: [],
    createdAt: new Date().toISOString(),
  };
  return {
    ok: true,
    state: { ...state, permits: [...state.permits, permit], seq: state.seq + 1 },
  };
}

export interface RenewalInput {
  permitId: string;
  /** 复测值，缺省时拒绝续期，锁定不变 */
  retestValue: string;
  newExpiryShift: number | null;
}

/** 续期：仅针对已到期许可，必须补录复测值，否则设备锁定不变 */
export function renewPermit(state: DeskState, input: RenewalInput): Transition {
  const permit = state.permits.find((p) => p.id === input.permitId);
  if (!permit) return fail("续期被拒绝：许可不存在，设备锁定不变。");
  if (permitStatus(permit, state.currentShift) !== "已到期") {
    return fail("续期被拒绝：许可仍在有效期内，无需续期。");
  }

  const retestValue = input.retestValue.trim();
  if (!retestValue) return fail("续期被拒绝：须补录复测值，设备锁定不变。");
  if (input.newExpiryShift === null || !Number.isInteger(input.newExpiryShift)) {
    return fail("续期被拒绝：缺少新的到期班次，设备锁定不变。");
  }
  if (input.newExpiryShift <= state.currentShift || input.newExpiryShift >= SHIFTS.length) {
    return fail("续期被拒绝：新的到期班次必须晚于当前班次，设备锁定不变。");
  }

  const renewal = {
    shift: state.currentShift,
    retestValue,
    newExpiryShift: input.newExpiryShift,
    at: new Date().toISOString(),
  };
  const permits = state.permits.map((p) =>
    p.id === permit.id
      ? { ...p, expiryShift: input.newExpiryShift as number, renewals: [...p.renewals, renewal] }
      : p
  );
  return { ok: true, state: { ...state, permits } };
}

export interface ReadingInput {
  equipmentId: string;
  value: string;
  note: string;
}

/** 登记参数读数：许可已到期的设备已锁定，拒绝登记 */
export function addReading(state: DeskState, input: ReadingInput): Transition {
  const equipment = EQUIPMENT.find((e) => e.id === input.equipmentId);
  if (!equipment) return fail("登记被拒绝：设备不存在。");

  const value = input.value.trim();
  if (!value) return fail("登记被拒绝：缺少参数读数。");
  if (isEquipmentLocked(state, equipment.id)) {
    return fail(`登记被拒绝：${equipment.name}的旁路许可已到期，读数登记已锁定，请先续期并补录复测值。`);
  }

  const reading: Reading = {
    id: `reading-${state.seq + 1}`,
    equipmentId: equipment.id,
    shift: state.currentShift,
    value,
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
  };
  return {
    ok: true,
    state: { ...state, readings: [reading, ...state.readings], seq: state.seq + 1 },
  };
}

export interface AnomalyInput {
  equipmentId: string;
  description: string;
}

/** 登记异常巡检项（未处理异常是登记旁路许可的前提） */
export function addAnomaly(state: DeskState, input: AnomalyInput): Transition {
  const equipment = EQUIPMENT.find((e) => e.id === input.equipmentId);
  if (!equipment) return fail("登记被拒绝：设备不存在。");

  const description = input.description.trim();
  if (!description) return fail("登记被拒绝：缺少异常描述。");

  const anomaly: Anomaly = {
    id: `anomaly-${state.seq + 1}`,
    equipmentId: equipment.id,
    description,
    shift: state.currentShift,
    handled: false,
    createdAt: new Date().toISOString(),
  };
  return {
    ok: true,
    state: { ...state, anomalies: [anomaly, ...state.anomalies], seq: state.seq + 1 },
  };
}

/** 将异常标记为已处理 */
export function resolveAnomaly(state: DeskState, anomalyId: string): Transition {
  if (!state.anomalies.some((a) => a.id === anomalyId)) {
    return fail("操作被拒绝：异常记录不存在。");
  }
  const anomalies = state.anomalies.map((a) =>
    a.id === anomalyId ? { ...a, handled: true } : a
  );
  return { ok: true, state: { ...state, anomalies } };
}

/** 切换值班班次；切到/越过许可到期班次后，许可自动转为已到期并锁定设备 */
export function setShift(state: DeskState, shift: number): Transition {
  if (!Number.isInteger(shift) || shift < 0 || shift >= SHIFTS.length) {
    return fail("操作被拒绝：班次不存在。");
  }
  return { ok: true, state: { ...state, currentShift: shift } };
}
