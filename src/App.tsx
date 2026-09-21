import "./styles.css";
import { StoreProvider, useStore } from "./state/store";
import { FilterSidebar, MetricsBoard, ShiftSwitch } from "./components/Board";
import { PermitDesk } from "./components/PermitDesk";
import { AnomalyTimeline, ReadingForm } from "./components/Operations";
import { HandoverSummary, HistoryTimeline } from "./components/Summary";

function ResetButton() {
    const { dispatch } = useStore();
    return (
        <button
            className="ghost"
            onClick={() => {
                if (
                    window.confirm(
                        "确定清空本地数据并恢复演示数据？该操作不可撤销。"
                    )
                ) {
                    dispatch({ type: "reset" });
                }
            }}
        >
            恢复演示数据
        </button>
    );
}

function Desk() {
    return (
        <main className="app">
            <section className="hero">
                <p>hxyfront-62001 · 船舶轮机 · Port 62001</p>
                <h1>临时旁路许可台</h1>
                <span>
                    为主机、发电机、泵组登记临时旁路：旁路原因、责任人与到期班次缺一不可，
                    同一设备最多一条有效许可，且必须存在未处理异常；任一条件不满足整次拒绝，原参数与许可不变。
                    许可到期后设备读数登记锁定，交接摘要与筛选同步标出，补录复测值续期后方可解锁。数据保存在浏览器本地。
                </span>
                <div className="hero-tools">
                    <ShiftSwitch />
                    <ResetButton />
                </div>
            </section>

            <MetricsBoard />

            <section className="workspace">
                <FilterSidebar />
                <div className="main-col">
                    <PermitDesk />
                </div>
            </section>

            <section className="workspace two-col">
                <ReadingForm />
                <AnomalyTimeline />
            </section>

            <HandoverSummary />

            <div className="history-gap">
                <HistoryTimeline />
            </div>
        </main>
    );
}

function App() {
    return (
        <StoreProvider>
            <Desk />
        </StoreProvider>
    );
}

export default App;
