// 页面组件：班次切换 + 机舱参数看板

import { METRICS, SHIFTS } from "../model/types";
import { useStore } from "../state/store";
import { boardMetrics, lockCountsByCategory } from "../state/selectors";
import { EQUIPMENT_CATEGORIES } from "../model/types";
import type { EquipmentCategory } from "../model/types";

export function ShiftSwitch() {
    const { state, dispatch } = useStore();
    // 提供"今天"与向后延续的班次，便于演示到期/续期
    const options = Array.from({ length: 12 }, (_, i) => i);

    return (
        <div className="shift-switch">
            <label>
                <span>当前值班班次（模拟时间推进，切班后许可自动到期锁定）</span>
                <select
                    value={state.currentShiftIndex}
                    onChange={(e) =>
                                        dispatch({
                                            type: "set-shift",
                                            shiftIndex: Number(e.target.value),
                                        })
                    }
                >
                    {options.map((i) => (
                        <option key={i} value={i}>
                            第{i + 1}班 · {SHIFTS[i % SHIFTS.length]}
                            {i === state.currentShiftIndex ? "（当前）" : ""}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

export function MetricsBoard() {
    const { state } = useStore();
    const m = boardMetrics(state);
    const values: Record<(typeof METRICS)[number]["key"], number> = {
        activePermits: m.activePermits,
        locked: m.locked,
        openAnomalies: m.openAnomalies,
        readings: m.readings,
    };

    return (
        <section className="metrics">
            {METRICS.map((metric) => (
                <article
                    key={metric.key}
                    className={metric.key === "locked" && m.locked > 0 ? "metric-alert" : ""}
                >
                    <small>{metric.label}</small>
                    <strong>{values[metric.key]}</strong>
                </article>
            ))}
        </section>
    );
}

export function FilterSidebar() {
    const { state, dispatch } = useStore();
    const lockCounts = lockCountsByCategory(state);
    const items: Array<EquipmentCategory | "全部"> = [
        "全部",
        ...EQUIPMENT_CATEGORIES,
    ];

    return (
        <aside className="panel filter-panel">
            <h2>设备筛选</h2>
            <p className="muted">
                红色角标表示该类下有旁路到期、读数锁定的设备
            </p>
            <div className="chips chips-vertical">
                {items.map((item) => {
                    const locked =
                        item === "全部"
                            ? Object.values(lockCounts).reduce((a, b) => a + b, 0)
                            : lockCounts[item];
                    return (
                        <button
                            key={item}
                            className={
                                state.filter === item
                                    ? "chip chip-active"
                                    : "chip"
                            }
                            onClick={() =>
                                dispatch({ type: "set-filter", filter: item })
                            }
                        >
                            <span>{item}</span>
                            {locked > 0 && (
                                <span className="chip-lock" title="到期锁定设备数">
                                    🔒 {locked}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
