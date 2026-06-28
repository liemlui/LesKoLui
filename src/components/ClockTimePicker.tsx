import { useState } from "react";
import Modal from "./Modal";

interface Props {
  value: string;    // "HH:mm" 24-hour
  onChange: (v: string) => void;
}

const CX = 110;
const HOUR_R = 72;
const MINUTES_Q = [0, 15, 30, 45];  // 15-min increments only

function polarToXY(angleRad: number, r: number) {
  return { x: CX + r * Math.cos(angleRad), y: CX + r * Math.sin(angleRad) };
}

export default function ClockTimePicker({ value, onChange }: Props) {
  const [open, setOpen]   = useState(false);
  const [mode, setMode]   = useState<"hour" | "minute">("hour");

  const parts   = (value || "08:00").split(":");
  const h24     = parseInt(parts[0]) || 0;
  const min     = parseInt(parts[1]) || 0;
  const isAM    = h24 < 12;
  const h12     = h24 % 12 || 12;
  const display = `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${isAM ? "AM" : "PM"}`;

  const snapMin = (m: number) => Math.round(m / 15) * 15 % 60;

  const setHourVal = (h: number) => {
    const h24new = isAM ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    const snappedMin = snapMin(min);
    onChange(`${String(h24new).padStart(2, "0")}:${String(snappedMin).padStart(2, "0")}`);
    setMode("minute");
  };

  const setMinuteVal = (m: number) => {
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    setOpen(false);
  };

  const setAMPM = (am: boolean) => {
    const newH = am ? (h24 >= 12 ? h24 - 12 : h24) : (h24 < 12 ? h24 + 12 : h24);
    onChange(`${String(newH).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  };

  // Hour clock face items
  const hours: { n: number; x: number; y: number }[] = [];
  for (let i = 1; i <= 12; i++) {
    const a = ((i / 12) * 360 - 90) * (Math.PI / 180);
    const p = polarToXY(a, HOUR_R);
    hours.push({ n: i, ...p });
  }

  // Hands (drawn on clock face, hour mode only)
  const hourAngle   = ((h12 / 12) * 360 + (min / 60) * 30 - 90) * (Math.PI / 180);
  const minuteAngle = ((min  / 60) * 360 - 90) * (Math.PI / 180);
  const hourEnd   = polarToXY(hourAngle,   55);
  const minuteEnd = polarToXY(minuteAngle, 70);

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMode("hour"); }}
        className="input text-left flex items-center gap-2 font-mono text-sm font-semibold text-gray-800">
        🕐 {display}
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} ariaLabel="Pilih waktu" panelClassName="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-xs outline-none max-h-[90vh] overflow-y-auto">
            {/* Digital header */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <button onClick={() => setMode("hour")}
                className={`text-4xl font-bold font-mono rounded-lg px-2 py-1 transition-colors ${mode === "hour" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-100"}`}>
                {String(h12).padStart(2, "0")}
              </button>
              <span className="text-3xl font-bold text-gray-300">:</span>
              <button onClick={() => setMode("minute")}
                className={`text-4xl font-bold font-mono rounded-lg px-2 py-1 transition-colors ${mode === "minute" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-100"}`}>
                {String(min).padStart(2, "0")}
              </button>
              <div className="flex flex-col gap-1 ml-2">
                <button onClick={() => setAMPM(true)}
                  className={`text-sm font-semibold px-2 py-1 rounded-lg transition-colors ${isAM ? "bg-blue-600 text-white" : "text-gray-400 bg-gray-100 hover:bg-gray-200"}`}>
                  AM
                </button>
                <button onClick={() => setAMPM(false)}
                  className={`text-sm font-semibold px-2 py-1 rounded-lg transition-colors ${!isAM ? "bg-blue-600 text-white" : "text-gray-400 bg-gray-100 hover:bg-gray-200"}`}>
                  PM
                </button>
              </div>
            </div>

            {mode === "hour" ? (
              /* Hour mode: analog clock face */
              <div className="flex justify-center">
                <svg viewBox="0 0 220 220" style={{ width: 220, height: 220 }}>
                  <circle cx={CX} cy={CX} r={106} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={2} />

                  {/* Tick marks */}
                  {Array.from({ length: 60 }, (_, i) => {
                    const a = (i / 60) * 360 - 90;
                    const ar = a * (Math.PI / 180);
                    const isMaj = i % 5 === 0;
                    const r1 = isMaj ? 96 : 100;
                    const p1 = polarToXY(ar, r1);
                    const p2 = polarToXY(ar, 104);
                    return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke={isMaj ? "#94a3b8" : "#cbd5e1"} strokeWidth={isMaj ? 2 : 1} />;
                  })}

                  {/* Hour hand */}
                  <line x1={CX} y1={CX} x2={hourEnd.x} y2={hourEnd.y}
                    stroke="#1e40af" strokeWidth={5} strokeLinecap="round" />

                  {/* Minute hand (dim) */}
                  <line x1={CX} y1={CX} x2={minuteEnd.x} y2={minuteEnd.y}
                    stroke="#2563eb" strokeWidth={3} strokeLinecap="round" opacity={0.35} />

                  <circle cx={CX} cy={CX} r={5} fill="#1e40af" />

                  {/* Hour numbers */}
                  {hours.map(({ n, x, y }) => {
                    const isActive = h12 === n;
                    return (
                      <g key={n} style={{ cursor: "pointer" }} onClick={() => setHourVal(n)}>
                        <circle cx={x} cy={y} r={17} fill={isActive ? "#2563eb" : "transparent"}
                          className="hover:fill-blue-100 transition-colors" />
                        <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                          fontSize={13} fontWeight={isActive ? "bold" : "500"}
                          fill={isActive ? "white" : "#475569"}>
                          {n}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              /* Minute mode: 4 chips at 15-min intervals */
              <div className="grid grid-cols-2 gap-3 mx-2 my-2" style={{ minHeight: 220 }}>
                {MINUTES_Q.map((m) => {
                  const isActive = min === m;
                  return (
                    <button key={m} type="button" onClick={() => setMinuteVal(m)}
                      className={`py-8 rounded-2xl text-3xl font-bold font-mono transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-blue-50"
                      }`}>
                      :{String(m).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-2 mb-4">
              {mode === "hour" ? "Tap angka jam" : "Pilih menit (kelipatan 15)"}
            </p>

            <button onClick={() => setOpen(false)}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
              Selesai
            </button>
        </Modal>
      )}
    </>
  );
}
