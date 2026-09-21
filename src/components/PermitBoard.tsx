import { FormEvent, useState } from "react";
import {
  equipmentName,
  permitStatus,
  renewPermit,
  shiftName,
  Transition,
} from "../model/transitions";
import { DeskState, Permit, SHIFTS } from "../model/types";

interface Props {
  state: DeskState;
  onApply: (result: Transition, okText: string) => void;

}

/** 单条许可的续期表单：必须补录复测值，否则锁定不变 */
function RenewForm({
  permit,
  state,
  onApply,
}: {
  permit: Permit;
  state: DeskState;
  onApply: Props["onApply"];
}) {
  const [retestValue, setRetestValue] = useState("");
  const [newExpiryShift, setNewExpiryShift] = useState<number | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(
      renewPermit(state, { permitId: permit.id, retestValue, newExpiryShift }),
      "许可已续期，设备解除锁定。"
    );
    setRetestValue("");
    setNewExpiryShift(null);
  };

  return (
    <form className="renew-form" onSubmit={submit}>
      <label>
        <span>复测值（续期必录）</span>
        <input
          value={retestValue}
          onChange={(e) => setRetestValue(e.target.value)}
          placeholder="填写复测值，如 0.41MPa"
        />
      </label>
      <label>
        <span>新到期班次</span>
        <select
          value={newExpiryShift === null ? "" : String(newExpiryShift)}
          onChange={(e) =>
            setNewExpiryShift(e.target.value === "" ? null : Number(e.target.value))
          }
        >
          <option value="">选择到期班次</option>
          {SHIFTS.map((name, index) => (
            <option key={name} value={index} disabled={index <= state.currentShift}>
              {shiftName(index)}
            </option>
          ))}
        </select>
      </label>
      <button className="primary" type="submit">
        续期
      </button>
    </form>
  );
}

/** 许可台账：有效 / 已到期许可及续期记录 */
export function PermitBoard({ state, onApply }: Props) {
  const permits = [...state.permits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>许可台账</p>
          <h2>旁路许可</h2>
        </div>
      </div>
      {permits.length === 0 && <p className="hint">暂无许可记录。</p>}
      <div className="records">
        {permits.map((permit) => {
          const status = permitStatus(permit, state.currentShift);
          return (
            <article key={permit.id} className={status === "已到期" ? "record-locked" : ""}>
              <b>{status === "已到期" ? "🔒" : "✓"}</b>
              <div>
                <h3>
                  {equipmentName(permit.equipmentId)}
                  <span className={`badge ${status === "已到期" ? "danger" : "ok"}`}>
                    {status}
                  </span>
                </h3>
                <p>
                  {permit.reason} · 责任人 {permit.owner} · {shiftName(permit.createdShift)}
                  登记 · {shiftName(permit.expiryShift)}到期
                </p>
                {permit.renewals.length > 0 && (
                  <p className="hint">
                    续期 {permit.renewals.length} 次：最近复测值 "
                    {permit.renewals[permit.renewals.length - 1].retestValue}"（
                    {shiftName(permit.renewals[permit.renewals.length - 1].shift)}）
                  </p>
                )}
                {status === "已到期" && (
                  <RenewForm permit={permit} state={state} onApply={onApply} />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
