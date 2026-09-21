import { FormEvent, useState } from "react";
import { registerPermit, shiftName, Transition } from "../model/transitions";
import { DeskState, EQUIPMENT, SHIFTS } from "../model/types";

interface Props {
  state: DeskState;
  onApply: (result: Transition, okText: string) => void;
}

/** 登记临时旁路许可：缺原因/到期班次、已有有效许可、无未处理异常时整次拒绝 */
export function PermitForm({ state, onApply }: Props) {
  const [equipmentId, setEquipmentId] = useState(EQUIPMENT[0].id);
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState("");
  const [expiryShift, setExpiryShift] = useState<number | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(
      registerPermit(state, { equipmentId, reason, owner, expiryShift }),
      "旁路许可已登记。"
    );
    setReason("");
    setExpiryShift(null);
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>临时旁路</p>
          <h2>登记旁路许可</h2>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="field-grid">
          <label>
            <span>设备名称</span>
            <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
              {EQUIPMENT.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.name}（{equipment.kind}）
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>责任人</span>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="填写责任人"
            />
          </label>
          <label>
            <span>旁路原因</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="填写旁路原因"
            />
          </label>
          <label>
            <span>到期班次</span>
            <select
              value={expiryShift === null ? "" : String(expiryShift)}
              onChange={(e) =>
                setExpiryShift(e.target.value === "" ? null : Number(e.target.value))
              }
            >
              <option value="">选择到期班次</option>
              {SHIFTS.map((name, index) => (
                <option key={name} value={index} disabled={index <= state.currentShift}>
                  {shiftName(index)}
                  {index <= state.currentShift ? "（已过）" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-footer">
          <p className="hint">
            同一设备最多一条有效许可；缺原因或到期班次、已有有效许可、没有未处理异常时整次拒绝。
          </p>
          <button className="primary" type="submit">
            登记许可
          </button>
        </div>
      </form>
    </section>
  );
}
