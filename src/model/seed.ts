import { DeskState } from "./types";

/**
 * 初始演示数据：当前 08-12班（序号 2）。
 * - 发电机#2 持有一条有效许可（16-20班 到期）
 * - 泵组#1 的许可已到期 → 设备锁定，演示续期补录复测值
 * - 主机、发电机#1 留有未处理异常，可正常登记新许可
 */
export function createSeedState(): DeskState {
  const now = new Date().toISOString();
  return {
    currentShift: 2,
    seq: 6,
    permits: [
      {
        id: "permit-1",
        equipmentId: "dg-2",
        reason: "冷却水温传感器漂移，临时旁路高温报警",
        owner: "三管轮",
        createdShift: 1,
        expiryShift: 4,
        renewals: [],
        createdAt: now,
      },
      {
        id: "permit-2",
        equipmentId: "pp-1",
        reason: "舱底水泵启停频繁，旁路液位联动待查",
        owner: "二管轮",
        createdShift: 0,
        expiryShift: 2,
        renewals: [],
        createdAt: now,
      },
    ],
    anomalies: [
      {
        id: "anomaly-1",
        equipmentId: "me-1",
        description: "主机滑油压力偏低报警，复测 0.38MPa",
        shift: 1,
        handled: false,
        createdAt: now,
      },
      {
        id: "anomaly-2",
        equipmentId: "dg-2",
        description: "冷却水温偏高，怀疑传感器漂移",
        shift: 1,
        handled: false,
        createdAt: now,
      },
      {
        id: "anomaly-3",
        equipmentId: "dg-1",
        description: "发电机#1 排烟温度偶发偏高",
        shift: 2,
        handled: false,
        createdAt: now,
      },
      {
        id: "anomaly-4",
        equipmentId: "pp-1",
        description: "舱底水泵启停频繁",
        shift: 0,
        handled: false,
        createdAt: now,
      },
    ],
    readings: [
      {
        id: "reading-1",
        equipmentId: "me-1",
        shift: 2,
        value: "转速 82rpm，滑油压力 0.42MPa",
        note: "正常巡检",
        createdAt: now,
      },
      {
        id: "reading-2",
        equipmentId: "dg-2",
        shift: 2,
        value: "冷却水温 91℃",
        note: "旁路许可 permit-1 生效中",
        createdAt: now,
      },
    ],
  };
}
