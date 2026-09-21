// 数据模型层：临时旁路许可台的核心领域类型

/** 可登记旁路许可的设备大类 */
export type EquipmentCategory = "主机" | "发电机" | "泵组";

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
}

/** 机舱参数读数登记 */
export interface Reading {
  id: string;
  equipmentId: string;
  /** 参数名称，如：主机转速、滑油压力、冷却水温、燃油消耗 */
  param: string;
  value: string;
  shiftIndex: number;
  createdAt: string;
}

/** 巡检异常项 */
export interface Anomaly {
  id: string;
  equipmentId: string;
  description: string;
  shiftIndex: number;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export type PermitStatus = "active" | "expired" | "closed";

/** 续期记录：续期必须补录复测值 */
export interface Renewal {
  retestValue: string;
  fromExpireShift: number;
  toExpireShift: number;
  shiftIndex: number;
  at: string;
}

/** 临时旁路许可：同一设备最多一条有效（active）许可 */
export interface BypassPermit {
  id: string;
  equipmentId: string;
  anomalyId: string;
  /** 旁路原因 */
  reason: string;
  /** 责任人 */
  owner: string;
  /** 签发班次 */
  issueShiftIndex: number;
  /** 到期班次 */
  expireShiftIndex: number;
  /** 签发时的初始复测/隔离读数 */
  baselineValue: string;
  renewals: Renewal[];
  closed: boolean;
  closedAt?: string;
  closeNote?: string;
  createdAt: string;
}

/** 时间线/历史事件 */
export type EventKind =
  | "reading"
  | "anomaly"
  | "anomaly-resolved"
  | "permit-issued"
  | "permit-renewed"
  | "permit-closed";

export interface HistoryEvent {
  id: string;
  kind: EventKind;
  equipmentId: string;
  shiftIndex: number;
  text: string;
  at: string;
}

export interface AppState {
  equipment: Equipment[];
  readings: Reading[];
  anomalies: Anomaly[];
  permits: BypassPermit[];
  events: HistoryEvent[];
  currentShiftIndex: number;
  filter: EquipmentCategory | "全部";
}

// ---------- 班次 ----------

/** 一天六班，顺序即班次索引，跨天循环 */
export const SHIFTS = [
  "00-04班",
  "04-08班",
  "08-12班",
  "12-16班",
  "16-20班",
  "20-24班",
] as const;

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ["主机", "发电机", "泵组"];

export function shiftLabel(index: number): string {
  return SHIFTS[((index % SHIFTS.length) + SHIFTS.length) % SHIFTS.length];
}

/** 顶部看板指标 */
export const METRICS = [
  { key: "activePermits", label: "有效旁路许可" },
  { key: "locked", label: "到期锁定设备" },
  { key: "openAnomalies", label: "未处理异常" },
  { key: "readings", label: "本班读数登记" },
] as const;
