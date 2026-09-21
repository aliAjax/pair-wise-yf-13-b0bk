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

/** 设备状态列表：有效许可 / 已到期锁定 / 未处理异常数 */
export function EquipmentStatus({ state }: Props) {
  return (
    <div className="equipment-status">
      <h2>设备状态</h2>
      <ul>
        {EQUIPMENT.map((equipment) => {
          const active = activePermitFor(state, equipment.id);
          const expired = expiredPermitFor(state, equipment.id);
          const unhandled = unhandledAnomaliesFor(state, equipment.id).length;
          return (
            <li key={equipment.id} className={expired ? "locked" : ""}>
              <div>
                <strong>{equipment.name}</strong>
                <small>{equipment.kind}</small>
              </div>
              <div className="badges">
                {active && (
                  <span className="badge ok">许可有效 · 至{shiftName(active.expiryShift)}</span>
                )}
                {expired && <span className="badge danger">🔒 已到期锁定</span>}
                {!active && !expired && <span className="badge muted">无许可</span>}
                {unhandled > 0 && <span className="badge warn">{unhandled} 条未处理异常</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
