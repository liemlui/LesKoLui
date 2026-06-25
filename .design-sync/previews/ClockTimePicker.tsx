import { ClockTimePicker } from "les-ko-lui";

export function Pagi() {
  return (
    <div style={{ padding: 16 }}>
      <ClockTimePicker value="08:00" onChange={() => {}} />
    </div>
  );
}

export function Siang() {
  return (
    <div style={{ padding: 16 }}>
      <ClockTimePicker value="14:30" onChange={() => {}} />
    </div>
  );
}

export function Malam() {
  return (
    <div style={{ padding: 16 }}>
      <ClockTimePicker value="19:00" onChange={() => {}} />
    </div>
  );
}
