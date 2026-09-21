import { FormEvent, useMemo, useState } from "react";
import {
  addReading,
  equipmentName,
  isEquipmentLocked,
  shiftName,
  Transition,
} from "../model/transitions";
import { DeskState, EQUIPMENT, EquipmentKind } from "../model/types";

interface Props {
  state: DeskState;
  onApply: (result: Transition, okText: string) => void;
}

const KIND_FILTERS: Array<EquipmentKind | "全部"> = ["全部", "主机", "发电机", "泵组"];

/** 读数登记 + 按设备筛选的历史记录；许可到期的设备锁定并同步标出 */
export function ReadingDesk({ state, onApply }: Props) {
  const [equipmentId, setEquipmentId] = useState(EQUIPMENT[0].id);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [kindFilter, setKindFilter] = useState<EquipmentKind | "全部">("全部");

  const lockedNames = EQUIPMENT.filter((e) => isEquipmentLocked(state, e.id)).map(
    (e) => e.name
  );

  const filtered = useMemo(() => {
    if (kindFilter === "全部") return state.readings;
    const ids = EQUIPMENT.filter((e) => e.kind === kindFilter).map((e) => e.id);
    return state.readings.filter((r) => ids.includes(r.equipmentId));
  }, [state.readings, kindFilter]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(addReading(state, { equipmentId, value, note }), "读数已登记。");
    setValue("");
    setNote("");
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>参数读数</p>
          <h2>读数登记与历史</h2>
        </div>
      </div>

      <form className="inline-form" onSubmit={submit}>
        <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
          {EQUIPMENT.map((equipment) => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.name}
              {isEquipmentLocked(state, equipment.id) ? "（🔒已锁定）" : ""}
            </option>
          ))}
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="参数读数，如 转速82rpm，滑油压力0.42MPa"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="交接备注（可选）"
        />
        <button className="primary" type="submit">
          登记读数
        </button>
      </form>

      <div className="filter-bar">
        <div className="chips">
          {KIND_FILTERS.map((kind) => (
            <button
              key={kind}
              className={kindFilter === kind ? "chip-active" : ""}
              onClick={() => setKindFilter(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        {lockedNames.length > 0 && (
          <span className="badge danger">🔒 已锁定：{lockedNames.join("、")}</span>
        )}
      </div>

      <div className="records">
        {filtered.length === 0 && <p className="hint">该筛选条件下暂无读数记录。</p>}
        {filtered.map((reading, index) => {
          const locked = isEquipmentLocked(state, reading.equipmentId);
          return (
            <article key={reading.id} className={locked ? "record-locked" : ""}>
              <b>{String(filtered.length - index).padStart(2, "0")}</b>
              <div>
                <h3>
                  {equipmentName(reading.equipmentId)} · {shiftName(reading.shift)}
                  {locked && <span className="badge danger">🔒 许可已到期</span>}
                </h3>
                <p>
                  {reading.value}
                  {reading.note ? ` · ${reading.note}` : ""}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
