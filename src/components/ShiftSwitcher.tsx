import { SHIFTS } from "../model/types";

interface Props {
  currentShift: number;
  onSelect: (shift: number) => void;
}

/** 值班班次切换：切到/越过许可到期班次后，许可自动到期并锁定设备 */
export function ShiftSwitcher({ currentShift, onSelect }: Props) {
  return (
    <div className="shift-switcher">
      <h2>值班班次</h2>
      <div className="chips">
        {SHIFTS.map((name, index) => (
          <button
            key={name}
            className={index === currentShift ? "chip-active" : ""}
            onClick={() => onSelect(index)}
          >
            {name}
          </button>
        ))}
      </div>
      <p className="hint">切换班次后，到达到期班次的许可将自动失效并锁定对应设备。</p>
    </div>
  );
}
