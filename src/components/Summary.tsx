// 页面组件：交接班摘要 + 历史记录（均随筛选同步，并标出锁定设备）

import { useStore } from "../state/store";
import {
    filteredEquipment,
    filteredEvents,
    handoverData,
} from "../state/selectors";
import { Badge, Panel, ShiftTag } from "./ui";

const EVENT_LABEL: Record<string, string> = {
    reading: "读数",
    anomaly: "异常",
    "anomaly-resolved": "处理",
    "permit-issued": "签发",
    "permit-renewed": "续期",
    "permit-closed": "关闭",
};

export function HandoverSummary() {
    const { state } = useStore();
    const data = handoverData(state);
    const visibleIds = new Set(
        filteredEquipment(state).map((v) => v.equipment.id)
    );
    const locked = data.locked.filter((v) => visibleIds.has(v.equipment.id));
    const activePermits = data.activePermits.filter((v) =>
        visibleIds.has(v.equipment.id)
    );
    const openAnomalies = data.openAnomalies.filter((a) =>
        visibleIds.has(a.equipmentId)
    );
    const readings = data.readingsThisShift.filter((r) =>
        visibleIds.has(r.equipmentId)
    );

    function exportText() {
        const lines = [
            `交接班摘要 · 当前班次 ${data.shiftIndex}`,
            "",
            `【锁定设备 ${locked.length}】`,
            ...locked.map(
                (v) =>
                    `- 🔒 ${v.equipment.category} · ${v.equipment.name}：旁路到期未续，读数登记锁定`
            ),
            "",
            `【有效旁路许可 ${activePermits.length}】`,
            ...activePermits.map(
                (v) =>
                    `- ${v.equipment.name}｜${v.permit.reason}｜责任人 ${v.permit.owner}｜到期班次 ${v.permit.expireShiftIndex}`
            ),
            "",
            `【未处理异常 ${openAnomalies.length}】`,
            ...openAnomalies.map((a) => {
                const eq = state.equipment.find((e) => e.id === a.equipmentId)!;
                return `- ${eq.name}：${a.description}`;
            }),
            "",
            `【本班读数 ${readings.length}】`,
            ...readings.map(
                (r) =>
                    `- ${state.equipment.find((e) => e.id === r.equipmentId)?.name}：${r.param} = ${r.value}`
            ),
        ];
        const blob = new Blob([lines.join("\n")], {
            type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `交接班摘要-班次${data.shiftIndex}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <Panel
            title="交接班摘要"
            subtitle={
                <>
                    当前 <ShiftTag index={data.shiftIndex} />
                </>
            }
            actions={
                <button onClick={exportText}>导出摘要</button>
            }
        >
            <div className="handover-grid">
                <div
                    className={`handover-block ${locked.length ? "handover-danger" : ""}`}
                >
                    <h3>
                        到期锁定设备
                        <span className="count">{locked.length}</span>
                    </h3>
                    {locked.length === 0 ? (
                        <p className="muted">无锁定设备，读数登记正常。</p>
                    ) : (
                        <ul className="lock-list">
                            {locked.map((v) => (
                                <li key={v.equipment.id}>
                                    🔒 <b>{v.equipment.name}</b>
                                    <Badge tone="locked">读数锁定</Badge>
                                    <span>
                                        旁路到期班次 {
                                            state.permits
                                                .filter(
                                                    (p) =>
                                                        p.equipmentId === v.equipment.id
                                                )
                                                .sort(
                                                    (a, b) =>
                                                        b.expireShiftIndex -
                                                        a.expireShiftIndex
                                                )[0]?.expireShiftIndex
                                        }
                                        ，须补录复测值续期
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="handover-block">
                    <h3>
                        有效旁路许可
                        <span className="count">{activePermits.length}</span>
                    </h3>
                    {activePermits.length === 0 ? (
                        <p className="muted">无有效许可。</p>
                    ) : (
                        <ul className="summary-list">
                            {activePermits.map((v) => (
                                <li key={v.permit.id}>
                                    <Badge tone="active">有效</Badge>
                                    <b>{v.equipment.name}</b>
                                    <span>
                                        {v.permit.reason}｜责任人
                                        {v.permit.owner}｜到期
                                        <ShiftTag index={v.permit.expireShiftIndex} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="handover-block">
                    <h3>
                        未处理异常
                        <span className="count">{openAnomalies.length}</span>
                    </h3>
                    {openAnomalies.length === 0 ? (
                        <p className="muted">全部异常已处理。</p>
                    ) : (
                        <ul className="summary-list">
                            {openAnomalies.map((a) => {
                                const eq = state.equipment.find(
                                    (e) => e.id === a.equipmentId
                                )!;
                                return (
                                    <li key={a.id}>
                                        <Badge tone="open">未处理</Badge>
                                        <b>{eq.name}</b>
                                        <span>{a.description}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="handover-block">
                    <h3>
                        本班读数登记
                        <span className="count">{readings.length}</span>
                    </h3>
                    {readings.length === 0 ? (
                        <p className="muted">本班尚无读数。</p>
                    ) : (
                        <ul className="summary-list compact">
                            {readings.map((r) => (
                                <li key={r.id}>
                                    <b>
                                        {state.equipment.find(
                                            (e) => e.id === r.equipmentId
                                        )?.name}
                                    </b>
                                    <span>
                                        {r.param} = {r.value}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Panel>
    );
}

export function HistoryTimeline() {
    const { state } = useStore();
    const events = filteredEvents(state);
    const lockedIds = new Set(
        filteredEquipment(state)
            .filter((v) => v.locked)
            .map((v) => v.equipment.id)
    );

    return (
        <Panel
            title="近期工作台 · 历史记录"
            subtitle="随设备筛选同步"
        >
            <div className="records">
                {events.length === 0 && (
                    <p className="muted empty">当前筛选下暂无历史记录。</p>
                )}
                {events.map((ev) => {
                    const eq = state.equipment.find(
                        (e) => e.id === ev.equipmentId
                    );
                    return (
                        <article key={ev.id} className="history-row">
                            <b>{EVENT_LABEL[ev.kind] ?? "事件"}</b>
                            <div>
                                <h3>
                                    <ShiftTag index={ev.shiftIndex} />
                                    {eq ? ` ${eq.name}` : ev.equipmentId}
                                    {lockedIds.has(ev.equipmentId) && (
                                        <Badge tone="locked">🔒 锁定</Badge>
                                    )}
                                </h3>
                                <p>{ev.text}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </Panel>
    );
}
