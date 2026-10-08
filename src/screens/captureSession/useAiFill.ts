import { useState } from "react";
import { draftShortNote, polishWhatsApp } from "../../lib/aiClient";
import { generateRichNote } from "../../lib/sessionTemplates";
import type { EngagementNarrativeInput, SessionType } from "../../lib/sessionTemplates";
import type { AiFeature } from "../../lib/aiUsage";

type AiNoteStyle = "rapikan" | "perluas" | "ringkas";

interface UseAiFillParams {
  student?: { name: string; level: string; grade?: string };
  sessionType?: SessionType;
  subjects: string[];
  topic?: string;
  mood?: string;
  needsWork: string;
  predictedGrade: string;
  situasiNote: string;
  duration: number;
  behaviorLabels: string[];
  responseLabel?: string;
  previousNote?: string;
  followUps: string[];
  engagement: EngagementNarrativeInput;
  hasEngagementInput: boolean;
  originalWaMessage: string;
  tutorName: string;
  shortNote: string;
  setShortNote: React.Dispatch<React.SetStateAction<string>>;
  /**
   * Catat biaya panggilan AI yang berhasil (G3-04). Dipanggil **sesudah**
   * permintaan selesai, supaya pemakaian tidak naik saat panggilannya gagal.
   * Diteruskan dari `CaptureSession` yang memegang `useAiAction()`.
   */
  catatBiaya: (fitur: AiFeature, biayaIdr: number, keterangan: string) => void;
}

/** State dan tindakan AI untuk wizard catat sesi. UI tetap berada di layar induk. */
export default function useAiFill({
  student, sessionType, subjects, topic, mood, needsWork, predictedGrade, situasiNote, duration,
  behaviorLabels, responseLabel, previousNote, followUps, engagement, hasEngagementInput,
  originalWaMessage, tutorName, shortNote, setShortNote, catatBiaya,
}: UseAiFillParams) {
  const [aiNoteLoading, setAiNoteLoading] = useState(false);
  const [aiWaLoading, setAiWaLoading] = useState(false);
  const [aiWaText, setAiWaText] = useState<string | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiNoteDraft, setAiNoteDraft] = useState<string | null>(null);
  const [aiNoteOriginal, setAiNoteOriginal] = useState("");
  const [aiNoteStyle, setAiNoteStyle] = useState<AiNoteStyle>("rapikan");
  const [showAiContext, setShowAiContext] = useState(false);

  const handleLocalGenerate = () => {
    setShortNote(generateRichNote({
      studentName: student?.name, sessionType, subjects, topic, mood,
      needsWork: needsWork || undefined,
      behaviorLabels: behaviorLabels.length > 0 ? behaviorLabels : undefined,
      responseLabel, previousNote, followUps, engagement,
    }));
    setAiNoteDraft(null);
    setAiNoteOriginal("");
  };

  const appendNoteChip = (text: string) => {
    setShortNote((prev) => {
      const clean = text.trim();
      if (!clean) return prev;
      const next = prev.trim();
      return next ? `${next} ${clean}` : clean;
    });
    setAiNoteDraft(null);
    setAiNoteOriginal("");
  };

  const onAiNoteConfirm = async (biayaIdr: number) => {
    setAiNoteLoading(true); setAiError("");
    setAiNoteDraft(null); setAiNoteOriginal(shortNote);
    try {
      const engagementLabels = hasEngagementInput ? [
        ...(engagement.prepared ? ["sudah siap bahan"] : []),
        ...(engagement.focused ? ["sangat fokus"] : []),
        ...(engagement.activeAsking ? ["aktif bertanya"] : []),
        ...(engagement.quickLearner ? ["cepat memahami"] : []),
        ...(engagement.drowsy ? ["mengantuk"] : []),
        ...(engagement.playingPhone ? ["main HP"] : []),
        ...(engagement.needsRepetition ? ["perlu pengulangan"] : []),
        ...(engagement.hwMissed ? ["PR tidak dikerjakan"] : []),
        ...(engagement.late ? ["telat"] : []),
        ...(engagement.bathroomBreaks ? ["sering ke toilet"] : []),
        ...(engagement.restless ? ["gelisah loncat-loncat"] : []),
        ...(engagement.offTask ? ["sibuk sendiri"] : []),
      ] : undefined;
      const res = await draftShortNote({
        student: { name: student?.name ?? "", level: student?.level ?? "" }, subjects, topic, mood,
        sessionType, grade: student?.grade, needsWork: needsWork || undefined,
        predictedGrade: predictedGrade.trim() || undefined, situasiNote: situasiNote.trim() || undefined,
        engagementScore: hasEngagementInput ? engagement.score : undefined, engagementLabels,
        behaviorLabels: behaviorLabels.length > 0 ? behaviorLabels : undefined, responseLabel,
        previousNote, draftText: shortNote.trim() || undefined, style: aiNoteStyle,
        followUps, durationHours: duration,
      });
      if (res.note) setAiNoteDraft(res.note);
      // Biaya dicatat hanya setelah balasan benar-benar diterima.
      catatBiaya("Draft catatan", biayaIdr, "Draft Catatan dengan AI");
    } catch (e) { setAiError((e as Error).message); }
    finally { setAiNoteLoading(false); }
  };

  const onPolishWa = async (biayaIdr: number) => {
    if (!student) return;
    setAiWaLoading(true); setAiError("");
    try {
      const res = await polishWhatsApp({ original: originalWaMessage, studentName: student.name, tutorName });
      if (res.message) setAiWaText(res.message);
      catatBiaya("Poles pesan WA", biayaIdr, "Poles WA AI");
    } catch (e) { setAiError((e as Error).message); }
    finally { setAiWaLoading(false); }
  };

  return {
    aiNoteLoading, aiWaLoading, aiWaText, setAiWaText, aiError,
    aiNoteDraft, setAiNoteDraft, aiNoteOriginal, setAiNoteOriginal,
    aiNoteStyle, setAiNoteStyle, showAiContext, setShowAiContext,
    handleLocalGenerate, appendNoteChip, onAiNoteConfirm, onPolishWa,
  };
}
