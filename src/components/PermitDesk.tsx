// 页面组件：临时旁路许可台 —— 登记/续期/关闭

import { useMemo, useState } from "react";
import { SHIFTS } from "../model/types";
import type {
    BypassPermit,
    Equipment,
    PermitStatus,
} from "../model/types";
import { useStore } from "../state/store";
import type { DispatchResult } from "../state/reducer";
import { isEquipmentLocked } from "../state/transitions";
import { filteredEquipment, filteredPermits } from "../state/selectors";
import { Badge, Notice, Panel, ShiftTag } from "./ui";

function shiftOptions(current: number) {
    // 到期班次可选当前班及以后 8 个班
    return Array.from({ length: 9 }, (_, i) => current + i);
}

export function PermitDesk() {
    const { state, dispatch } = useStore();
    const views = filteredEquipment(state);

    const [equipmentId, setEquipmentId] = useState("");
    const [reason, setReason] = useState("");
    const [owner, setOwner] = useState("");
    const [baselineValue, setBaselineValue] = useState("");
    const [expireShiftIndex, setExpireShiftIndex] = useState<number | "">("");
    const [message, setMessage] = useState<{
        kind: "error" | "success";
        text: string;
    } | null>(null);

    const selected = views.find((v) => v.equipment.id === equipmentId);

    const issueHint = useMemo(() => {
        if (!selected) return null;
        if (selected.activePermit)
            return "该设备已有一条有效许可，再登记将被整次拒绝。";
        if (selected.openAnomalyCount === 0)
            return "该设备没有未处理异常，不能登记旁路，整次登记将被拒绝。";
        if (selected.locked)
            return "该设备处于到期锁定状态，请先在下方许可上补录复测值续期。";
        return null;
    }, [selected]);

    function resetForm() {
        setReason("");
        setOwner("");
        setBaselineValue("");
        setExpireShiftIndex("");
    }

    function submit() {
        if (expireShiftIndex === "") {
            // 缺到期班次也要整次拒绝
            const r = dispatch({
                type: "issue-permit",
                input: {
                    equipmentId,
                    reason,
                    owner,
                    baselineValue,
                    expireShiftIndex: Number.NaN,
                },
            });
            setMessage(
                r.accepted
                    ? { kind: "success", text: "旁路许可已签发。" }
                    : { kind: "error", text: r.error }
            );
            return;
        }
        const r = dispatch({
            type: "issue-permit",
            input: {
                equipmentId,
                reason,
                owner,
                baselineValue,
                expireShiftIndex,
            },
        });
        if (r.accepted) {
            resetForm();
            setMessage({ kind: "success", text: "旁路许可已签发，原参数保持不变。" });
        } else {
            // 整次拒绝：表单输入保留，便于补正；原参数与许可不变
            setMessage({ kind: "error", text: r.error });
        }
    }

    return (
        <Panel
            title="临时旁路许可台"
            subtitle="主机 / 发电机 / 泵组"
        >
            <p className="muted rule">
                规则：旁路原因、责任人、到期班次为必填；同一设备最多一条有效许可；设备必须存在未处理异常。
                任一不满足则<strong>整次拒绝</strong>，原参数与许可保持不变。许可到期后该设备<strong>读数登记锁定</strong>，续期须补录复测值。
            </p>

            {message && <Notice kind={message.kind}>{message.text}</Notice>}

            <div className="field-grid">
                <label>
                    <span>旁路设备 *</span>
                    <select
                        value={equipmentId}
                        onChange={(e) => setEquipmentId(e.target.value)}
                    >
                        <option value="">请选择设备</option>
                        {views.map((v) => (
                            <option key={v.equipment.id} value={v.equipment.id}>
                                {v.equipment.category} · {v.equipment.name}
                                {v.locked ? "（锁定）" : v.activePermit ? "（已有有效许可）" : ""}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>责任人 *</span>
                    <input
                        placeholder="如：李轮机"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                    />
                </label>
                <label className="field-wide">
                    <span>旁路原因 *</span>
                    <input
                        placeholder="如：排温传感器校验中，暂时旁路报警，人工每小时测记"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </label>
                <label>
                    <span>签发时隔离/基线读数</span>
                    <input
                        placeholder="如：排温 412 ℃"
                        value={baselineValue}
                        onChange={(e) => setBaselineValue(e.target.value)}
                    />
                </label>
                <label>
                    <span>到期班次 *</span>
                    <select
                        value={expireShiftIndex}
                        onChange={(e) =>
                            setExpireShiftIndex(
                                e.target.value === "" ? "" : Number(e.target.value)
                            )
                        }
                    >
                        <option value="">请选择到期班次</option>
                        {shiftOptions(state.currentShiftIndex).map((i) => (
                            <option key={i} value={i}>
                                {SHIFTS[i % SHIFTS.length]}（第{i + 1}班
                                {i === state.currentShiftIndex ? "·本班" : ""}）
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {issueHint && <p className="form-hint">⚠️ {issueHint}</p>}
            <div className="form-actions">
                <button className="primary" onClick={submit}>
                    登记旁路许可
                </button>
                <button onClick={resetForm}>清空</button>
            </div>

            <PermitList />
        </Panel>
    );
}

const STATUS_LABEL: Record<PermitStatus, string> = {
    active: "有效",
    expired: "已到期 · 锁定",
    closed: "已关闭",
};

function PermitList() {
    const { state, dispatch } = useStore();
    const permits = filteredPermits(state);

    if (permits.length === 0) {
        return <p className="muted empty">当前筛选下暂无旁路许可。</p>;
    }

    return (
        <div className="permit-list">
            <h3>许可台账</h3>
            {permits.map(({ permit, status, equipment }) => (
                <PermitCard
                    key={permit.id}
                    permit={permit}
                    status={status}
                    equipment={equipment}
                    locked={isEquipmentLocked(
                        state,
                        equipment.id,
                        state.currentShiftIndex
                    )}
                    onClose={(note) =>
                        dispatch({
                            type: "close-permit",
                            permitId: permit.id,
                            note,
                        })
                    }
                    onRenew={(retestValue, expireShiftIndex) =>
                        dispatch({
                            type: "renew-permit",
                            input: {
                                permitId: permit.id,
                                retestValue,
                                expireShiftIndex,
                            },
                        })
                    }
                />
            ))}
        </div>
    );
}

function PermitCard({
    permit,
    status,
    equipment,
    locked,
    onClose,
    onRenew,
}: {
    permit: BypassPermit;
    status: PermitStatus;
    equipment: Equipment;
    locked: boolean;
    onClose: (note: string) => DispatchResult;
    onRenew: (
        retestValue: string,
        expireShiftIndex: number
    ) => DispatchResult;
}) {
    const { state } = useStore();
    const [retestValue, setRetestValue] = useState("");
    const [expireShiftIndex, setExpireShiftIndex] = useState<number | "">("");
    const [error, setError] = useState<string | null>(null);
    const [showClose, setShowClose] = useState(false);
    const [closeNote, setCloseNote] = useState("");

    function renew() {
        if (expireShiftIndex === "") {
            setError("请选择新的到期班次；复测值未补录前设备保持锁定。");
            return;
        }
        const r = onRenew(retestValue, expireShiftIndex);
        if (r && !r.accepted) {
            setError(r.error);
            return;
        }
        setError(null);
        setRetestValue("");
        setExpireShiftIndex("");
    }

    return (
        <article className={`permit-card permit-${status}`}>
            <div className="permit-head">
                <div>
                    <h4>
                        {equipment.category} · {equipment.name}
                        {locked && <span className="lock-flag">🔒 读数锁定中</span>}
                    </h4>
                    <Badge tone={status}>{STATUS_LABEL[status]}</Badge>
                </div>
                <div className="permit-shifts">
                    <span>签发 <ShiftTag index={permit.issueShiftIndex} /></span>
                    <span>
                        到期{" "}
                        <strong
                            className={
                                status === "expired" ? "expire-expired" : undefined
                            }
                        >
                            <ShiftTag index={permit.expireShiftIndex} />
                        </strong>
                    </span>
                </div>
            </div>

            <dl className="permit-meta">
                <div><dt>旁路原因</dt><dd>{permit.reason}</dd></div>
                <div><dt>责任人</dt><dd>{permit.owner}</dd></div>
                <div><dt>基线读数</dt><dd>{permit.baselineValue || "—"}</dd></div>
            </dl>

            {permit.renewals.length > 0 && (
                <div className="renewal-log">
                    <p>续期记录（已补录复测值）：</p>
                    <ul>
                        {permit.renewals.map((r, i) => (
                            <li key={i}>
                                <ShiftTag index={r.shiftIndex} /> 复测值
                                <b> {r.retestValue}</b>，到期 {r.fromExpireShift} →{" "}
                                <ShiftTag index={r.toExpireShift} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {status === "expired" && (
                <div className="renew-box">
                    <p className="renew-warn">
                        已过到期班次，设备读数登记锁定。续期<strong>必须补录复测值</strong>，否则锁定不变。
                    </p>
                    <div className="renew-form">
                        <input
                            placeholder="复测值 *（如：出口压力 0.30 MPa）"
                            value={retestValue}
                            onChange={(e) => setRetestValue(e.target.value)}
                        />
                        <select
                            value={expireShiftIndex}
                            onChange={(e) =>
                                setExpireShiftIndex(
                                    e.target.value === "" ? "" : Number(e.target.value)
                                )
                            }
                        >
                            <option value="">新到期班次 *</option>
                            {Array.from({ length: 9 }, (_, k) => state.currentShiftIndex + k).map(
                                (i) => (
                                    <option key={i} value={i}>
                                        {SHIFTS[i % SHIFTS.length]}
                                    </option>
                                )
                            )}
                        </select>
                        <button className="primary" onClick={renew}>
                            补录复测并续期
                        </button>
                    </div>
                    {error && <Notice kind="error">{error}</Notice>}
                </div>
            )}

            {status === "active" && (
                <div className="permit-actions">
                    {!showClose ? (
                        <button onClick={() => setShowClose(true)}>
                            异常已消除，关闭许可
                        </button>
                    ) : (
                        <div className="close-box">
                            <input
                                placeholder="关闭备注（可选）"
                                value={closeNote}
                                onChange={(e) => setCloseNote(e.target.value)}
                            />
                            <button
                                className="primary"
                                onClick={() => {
                                    onClose(closeNote);
                                    setShowClose(false);
                                    setCloseNote("");
                                }}
                            >
                                确认关闭
                            </button>
                            <button onClick={() => setShowClose(false)}>取消</button>
                        </div>
                    )}
                </div>
            )}

            {status === "closed" && permit.closeNote && (
                <p className="muted">关闭备注：{permit.closeNote}</p>
            )}
        </article>
    );
}
