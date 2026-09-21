import { useState } from "react";
import { AnomalyTimeline } from "./components/AnomalyTimeline";
import { EquipmentStatus } from "./components/EquipmentStatus";
import { HandoverSummary } from "./components/HandoverSummary";
import { PermitBoard } from "./components/PermitBoard";
import { PermitForm } from "./components/PermitForm";
import { ReadingDesk } from "./components/ReadingDesk";
import { ShiftSwitcher } from "./components/ShiftSwitcher";
import { createSeedState } from "./model/seed";
import { setShift, shiftName, Transition } from "./model/transitions";
import { DeskState } from "./model/types";
import { usePersistentState } from "./store/usePersistentState";
import "./styles.css";

interface Notice {
  kind: "ok" | "error";
  text: string;
}

function App() {
  const [state, setState] = usePersistentState<DeskState>(createSeedState);
  const [notice, setNotice] = useState<Notice | null>(null);

  /** 统一应用状态流转：失败时原状态不变，仅提示拒绝原因 */
  const apply = (result: Transition, okText: string) => {
    if (result.ok) {
      setState(result.state);
      setNotice({ kind: "ok", text: okText });
    } else {
      setNotice({ kind: "error", text: result.error });
    }
  };

  const activePermits = state.permits.filter(
    (p) => state.currentShift < p.expiryShift
  ).length;
  const lockedCount = state.permits.length - activePermits;
  const unhandledCount = state.anomalies.filter((a) => !a.handled).length;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62001 · 源提示词1 · Port 62001</p>
        <h1>临时旁路许可台</h1>
        <span>
          面向船舶轮机值班的临时旁路管理：为主机、发电机或泵组登记旁路原因、责任人和到期班次；
          同一设备最多一条有效许可，到期后设备锁定读数登记，续期须补录复测值。
          数据保存在浏览器本地，刷新后保留。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>当前班次</small>
          <strong>{shiftName(state.currentShift)}</strong>
        </article>
        <article>
          <small>有效许可</small>
          <strong>{activePermits}</strong>
        </article>
        <article>
          <small>已到期锁定</small>
          <strong>{lockedCount}</strong>
        </article>
        <article>
          <small>未处理异常</small>
          <strong>{unhandledCount}</strong>
        </article>
      </section>

      {notice && (
        <div className={`notice ${notice.kind}`} role="status">
          {notice.text}
          <button className="link-btn" onClick={() => setNotice(null)}>
            知道了
          </button>
        </div>
      )}

      <section className="workspace">
        <aside className="panel">
          <ShiftSwitcher
            currentShift={state.currentShift}
            onSelect={(shift) => apply(setShift(state, shift), `已切换到${shiftName(shift)}。`)}
          />
          <EquipmentStatus state={state} />
        </aside>
        <PermitForm state={state} onApply={apply} />
      </section>

      <PermitBoard state={state} onApply={apply} />

      <section className="workspace two-col">
        <AnomalyTimeline state={state} onApply={apply} />
        <HandoverSummary state={state} />
      </section>

      <ReadingDesk state={state} onApply={apply} />
    </main>
  );
}

export default App;
