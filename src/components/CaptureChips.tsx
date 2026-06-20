interface Props {
  mood?: string;
  topic?: string;
  needsWork?: string;
  predictedGrade?: string;
  onMoodChange: (v: string | undefined) => void;
  onTopicChange: (v: string) => void;
  onNeedsWorkChange: (v: string) => void;
  onGradeChange: (v: string) => void;
}

const MOODS = ["Semangat", "Fokus", "Biasa", "Lelah", "Kesulitan"];

export default function CaptureChips({
  mood, topic, needsWork, predictedGrade,
  onMoodChange, onTopicChange, onNeedsWorkChange, onGradeChange,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Mood */}
      <div>
        <label className="label">Mood</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button type="button" key={m}
              className={`px-3 py-1 rounded-full text-sm border ${
                mood === m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
              }`}
              onClick={() => onMoodChange(mood === m ? undefined : m)}>{m}</button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="label">Topik</label>
        <input className="input" placeholder="e.g. Linear System" value={topic ?? ""} onChange={(e) => onTopicChange(e.target.value)} />
      </div>

      {/* Needs Work */}
      <div>
        <label className="label">Perlu Perhatian</label>
        <input className="input" placeholder="e.g. ketelitian" value={needsWork ?? ""} onChange={(e) => onNeedsWorkChange(e.target.value)} />
      </div>

      {/* Predicted Grade */}
      <div>
        <label className="label">Prediksi Nilai</label>
        <input className="input" placeholder="e.g. 5–6 / 8" value={predictedGrade ?? ""} onChange={(e) => onGradeChange(e.target.value)} />
      </div>
    </div>
  );
}
