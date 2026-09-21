import { FormEvent, useState } from "react";
import {
  addAnomaly,
  equipmentName,
  resolveAnomaly,
  shiftName,
  Transition,
} from "../model/transitions";
import { DeskState, EQUIPMENT } from "../model/types";

interface Props {
  state: DeskState;
  onApply: (result: Transition, okText: string) => void;
}

/** 异常记录时间线：未处理异常是登记旁路许可的前提 */
export function AnomalyTimeline({ state, onApply }: Props) {
  const [equipmentId, setEquipmentId] = useState(EQUIPMENT[0].id);
  const [description, setDescription] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(addAnomaly(state, { equipmentId, description }), "异常已登记。");
    setDescription("");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>异常巡检</p>
          <h2>异常记录时间线</h2>
        </div>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
          {EQUIPMENT.map((equipment) => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.name}
            </option>
          ))}
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="填写异常描述"
        />
        <button type="submit">登记异常</button>
      </form>
      <div className="records">
        {state.anomalies.map((anomaly) => (
          <article key={anomaly.id}>
            <b>{shiftName(anomaly.shift).slice(0, 2)}</b>
            <div>
              <h3>
                {equipmentName(anomaly.equipmentId)}
                <span className={`badge ${anomaly.handled ? "muted" : "warn"}`}>
                  {anomaly.handled ? "已处理" : "未处理"}
                </span>
              </h3>
              <p>
                {shiftName(anomaly.shift)} · {anomaly.description}
              </p>
              {!anomaly.handled && (
                <button
                  className="link-btn"
                  onClick={() =>
                    onApply(resolveAnomaly(state, anomaly.id), "异常已标记为已处理。")
                  }
                >
                  标记已处理
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
