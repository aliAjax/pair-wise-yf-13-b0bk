/**
 * 临时旁路许可台 —— 数据模型
 *
 * 一个值班日划分为 6 个班次，许可的“到期班次”用班次序号表示：
 * 当前班次序号 < 到期班次序号 时许可有效，到达/超过即视为已到期。
 */

export const SHIFTS = [
  "00-04班",
  "04-08班",
  "08-12班",
  "12-16班",
  "16-20班",
  "20-24班",
] as const;

export type EquipmentKind = "主机" | "发电机" | "泵组";

export interface Equipment {
  id: string;
  name: string;
  kind: EquipmentKind;
}

/** 旁路许可只覆盖主机、发电机、泵组三类设备 */
export const EQUIPMENT: Equipment[] = [
  { id: "me-1", name: "主机", kind: "主机" },
  { id: "dg-1", name: "发电机#1", kind: "发电机" },
  { id: "dg-2", name: "发电机#2", kind: "发电机" },
  { id: "pp-1", name: "泵组#1", kind: "泵组" },
  { id: "pp-2", name: "泵组#2", kind: "泵组" },
];

/** 续期记录：续期时必须补录复测值 */
export interface Renewal {
  /** 办理续期时的班次序号 */
  shift: number;
  /** 补录的复测值 */
  retestValue: string;
  /** 新的到期班次序号 */
  newExpiryShift: number;
  at: string;
}

export interface Permit {
  id: string;
  equipmentId: string;
  /** 旁路原因 */
  reason: string;
  /** 责任人 */
  owner: string;
  /** 登记时的班次序号 */
  createdShift: number;
  /** 到期班次序号（不含），当前班次 >= 到期班次即已到期 */
  expiryShift: number;
  renewals: Renewal[];
  createdAt: string;
}

export interface Anomaly {
  id: string;
  equipmentId: string;
  description: string;
  /** 发现时的班次序号 */
  shift: number;
  /** 处理状态：false = 未处理 */
  handled: boolean;
  createdAt: string;
}

export interface Reading {
  id: string;
  equipmentId: string;
  /** 登记时的班次序号 */
  shift: number;
  /** 参数读数 */
  value: string;
  note: string;
  createdAt: string;
}

/** 许可台全部持久化状态 */
export interface DeskState {
  /** 当前班次序号（SHIFTS 下标） */
  currentShift: number;
  permits: Permit[];
  anomalies: Anomaly[];
  readings: Reading[];
  /** 自增序号，用于生成确定性 id */
  seq: number;
}
