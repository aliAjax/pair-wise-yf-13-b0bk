// 页面组件：参数读数登记 + 异常巡检项

import { useState } from "react";
import { useStore } from "../state/store";
import { isEquipmentLocked } from "../state/transitions";
import { filteredEquipment } from "../state/selectors";
import { Badge, Notice, Panel, ShiftTag } from "./ui";

const PARAM_PRESETS = ["主机转速", "滑油压力", "冷却水温", "燃油消耗"];

export function ReadingForm() {
    const { state, dispatch } = useStore();
    const views = filteredEquipment(state);

    const [equipmentId, setEquipmentId] = useState("");
    const [param, setParam] = useState("");
    const [value, setValue] = useState("");
    const [message, setMessage] = useState<{
        kind: "error" | "success";
        text: string;
    } | null>(null);

    const locked = equipmentId
        ? isEquipmentLocked(state, equipmentId, state.currentShiftIndex)
        : false;
    const equipment = views.find((v) => v.equipment.id === equipmentId);

    function submit() {
        const r = dispatch({
            type: "register-reading",
            equipmentId,
            param,
            value,
        });
        if (r.accepted) {
            setParam("");
            setValue("");
            setMessage({ kind: "success", text: "读数已登记到当前班次。" });
        } else {
            setMessage({ kind: "error", text: r.error });
        }
    }

    return (
        <Panel title="机舱参数读数登记" subtitle="运行参数">
            {message && <Notice kind={message.kind}>{message.text}</Notice>}
            <div className="field-grid">
                <label>
                    <span>设备</span>
                    <select
                        value={equipmentId}
                        onChange={(e) => setEquipmentId(e.target.value)}
                    >
                        <option value="">请选择设备</option>
                        {views.map((v) => (
                            <option key={v.equipment.id} value={v.equipment.id}>
                                {v.equipment.category} · {v.equipment.name}
                                {v.locked ? "（锁定）" : ""}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>参数</span>
                    <input
                        list="param-presets"
                        placeholder="主机转速 / 滑油压力 …"
                        value={param}
                        onChange={(e) => setParam(e.target.value)}
                    />
                    <datalist id="param-presets">
                        {PARAM_PRESETS.map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                </label>
                <label className="field-wide">
                    <span>参数读数</span>
                    <input
                        placeholder="如：82 rpm、0.42 MPa、76 ℃"
                        value={value}
                        disabled={locked}
                        onChange={(e) => setValue(e.target.value)}
                    />
                </label>
            </div>

            {locked && equipment && (
                <p className="form-hint lock-hint">
                    🔒 {equipment.equipment.name} 旁路已到期未续，
                    <b>读数登记锁定</b>。请到许可台补录复测值后续期解锁。
                </p>
            )}

            <div className="form-actions">
                <button
                    className="primary"
                    disabled={locked}
                    onClick={submit}
                >
                    {locked ? "登记已锁定" : "登记读数"}
                </button>
            </div>
        </Panel>
    );
}

export function AnomalyTimeline() {
    const { state, dispatch } = useStore();
    const ids = new Set(
        filteredEquipment(state).map((v) => v.equipment.id)
    );
    const anomalies = state.anomalies.filter((a) => ids.has(a.equipmentId));
    const equipmentViews = filteredEquipment(state);

    const [equipmentId, setEquipmentId] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);

    function submit() {
        const r = dispatch({
            type: "register-anomaly",
            equipmentId,
            description,
        });
        if (r.accepted) {
            setDescription("");
            setError(null);
        } else {
            setError(r.error);
        }
    }

    return (
        <Panel title="异常巡检项" subtitle="未处理异常是登记旁路的前提">
            {error && <Notice kind="error">{error}</Notice>}
            <div className="anomaly-form">
                <select
                    value={equipmentId}
                    onChange={(e) => setEquipmentId(e.target.value)}
                >
                    <option value="">设备</option>
                    {equipmentViews.map((v) => (
                        <option key={v.equipment.id} value={v.equipment.id}>
                            {v.equipment.category} · {v.equipment.name}
                        </option>
                    ))}
                </select>
                <input
                    placeholder="异常描述，如：冷却水温偏高"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <button className="primary" onClick={submit}>
                    上报异常
                </button>
            </div>

            <ul className="timeline">
                {anomalies.length === 0 && (
                    <p className="muted empty">当前筛选下暂无异常记录。</p>
                )}
                {anomalies.map((a) => {
                    const eq = state.equipment.find(
                        (e) => e.id === a.equipmentId
                    )!;
                    return (
                        <li
                            key={a.id}
                            className={a.status === "open" ? "tl-open" : "tl-done"}
                        >
                            <div className="tl-dot" />
                            <div className="tl-body">
                                <div className="tl-head">
                                    <b>
                                        {eq.category} · {eq.name}
                                    </b>
                                    <ShiftTag index={a.shiftIndex} />
                                    <Badge tone={a.status === "open" ? "open" : "resolved"}>
                                        {a.status === "open" ? "未处理" : "已处理"}
                                    </Badge>
                                </div>
                                <p>{a.description}</p>
                                {a.status === "open" && (
                                    <button
                                        onClick={() =>
                                            dispatch({
                                                type: "resolve-anomaly",
                                                anomalyId: a.id,
                                            })
                                        }
                                    >
                                        标记已处理
                                    </button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}
