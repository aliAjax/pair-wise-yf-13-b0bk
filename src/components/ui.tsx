// 页面组件：通用小组件

import type { ReactNode } from "react";
import { shiftLabel } from "../model/types";

export function ShiftTag({ index }: { index: number }) {
    return <span className="shift-tag">#{index} {shiftLabel(index)}</span>;
}

export function Notice({
    kind,
    children,
}: {
    kind: "error" | "success";
    children: ReactNode;
}) {
    if (!children) return null;
    return <div className={`notice notice-${kind}`}>{children}</div>;
}

export function Badge({
    tone,
    children,
}: {
    tone: "active" | "expired" | "closed" | "locked" | "open" | "resolved";
    children: ReactNode;
}) {
    return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Panel({
    title,
    subtitle,
    actions,
    children,
}: {
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="panel">
            <div className="heading">
                <div>
                    {subtitle ? <p>{subtitle}</p> : null}
                    <h2>{title}</h2>
                </div>
                {actions}
            </div>
            {children}
        </section>
    );
}
