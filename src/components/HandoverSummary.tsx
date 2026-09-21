import {
  activePermitFor,
  expiredPermitFor,
  shiftName,
  unhandledAnomaliesFor,
} from "../model/transitions";
import { DeskState, EQUIPMENT } from "../model/types";

interface Props {
  state: DeskState;
}

/** 交接班摘要：有效许可、到期锁定设备与未处理异常同步标出 */
export function HandoverSummary({ state }: Props) {
  const lines: Array<{ key: string; icon: string; text: string; tone: "ok" | "danger" | "warn" }> = [];

  for (const equipment of EQUIPMENT) {
    const active = activePermitFor(state, equipment.id);
    const expired = expiredPermitFor(state, equipment.id);
    const unhandled = unhandledAnomaliesFor(state, equipment.id).length;

    if (active) {
      lines.push({
        key: `${equipment.id}-active`,
        icon: "🛡",
        tone: "ok",
        text: `${equipment.name}：旁路许可有效（${active.reason}），责任人 ${active.owner}，${shiftName(active.expiryShift)}到期。`,
      });
    }
    if (expired) {
      lines.push({
        key: `${equipment.id}-expired`,
        icon: "🔒",
        tone: "danger",
        text: `${equipment.name}：许可已于${shiftName(expired.expiryShift)}到期，读数登记已锁定，续期须补录复测值。`,
      });
    }
    if (unhandled > 0) {
      lines.push({
        key: `${equipment.id}-anomaly`,
        icon: "⚠",
        tone: "warn",
        text: `${equipment.name}：${unhandled} 条未处理异常待跟进。`,
      });
    }
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>交接班</p>
          <h2>交接摘要 · {shiftName(state.currentShift)}</h2>
        </div>
      </div>
      {lines.length === 0 && <p className="hint">本班无有效许可、锁定设备或未处理异常。</p>}
      <ul className="summary-list">
        {lines.map((line) => (
          <li key={line.key} className={`tone-${line.tone}`}>
            <span>{line.icon}</span>
            {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
