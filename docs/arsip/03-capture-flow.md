# 03 - Capture Flow

> ⚠️ **DOKUMEN INI USANG — DIPINDAH KE `docs/arsip/` PADA 2026-09-13.**
> Alasannya: urutan UI di bawah **tidak lagi cocok dengan aplikasi** (sekarang 6 langkah:
> Jadwal → Materi → Kondisi → Detail → Catatan → Bukti; `mood` sudah bukan penilaian dan
> tidak lagi menggeser skor; ada pemilih topik berbasis bab + penyimpanan bab). Isi aslinya
> dibekukan sebagai catatan historis.
> **Yang berlaku sekarang:** untuk perilaku terkini baca kode `src/screens/CaptureSession.tsx`
> serta [`../arsitektur/10-conventions-and-pitfalls.md`](../arsitektur/10-conventions-and-pitfalls.md).

Goal: record one completed session quickly, fully offline. Screen: `screens/CaptureSession.tsx`. Helpers: `lib/foto.ts`, `lib/engagement.ts`.

## UI Order

1. **Student picker** - dropdown of active students, or pre-filled when navigated from a scheduled session. Required.
2. **Session brief** - after selecting a student, show context before capture:
   - Last completed session: date, subjects, short note, topic, predicted grade.
   - Pending homework for this student.
   - Pending follow-up items from previous sessions.
3. **Session date** - defaults to today in WIB, but allows backdating up to 14 days.
4. **Subject picker** - multi-select chips from `student.subjects` (tap to toggle). Can also add custom subjects via "+ Lainnya". Optional.
5. **Photo** - tap to open camera/file picker; compress on select; show thumbnail. Optional but encouraged.
6. **Short note** - raw note typed by the tutor. Required. Show autocomplete suggestions from `recentShortNotes()` filtered by current input.
7. **Optional structured fields** - `mood`, `topic`, `needsWork`, and `predictedGrade`.
8. **Engagement indicators** - optional toggles (12+ indicators):
    - Positif: prepared (+2), ocused (+1), ctiveAsking (+1), quickLearner (+1)
    - Negatif: drowsy (-1), playingPhone (-1), 
eedsRepetition (-1), hwMissed (-1), late (-1), athroomBreaks (-1), estless (-1), offTask (-1)
    - Behavior tags dan response tags juga berkontribusi pada skor
    Score dihitung dari base 5 + modifiers, clamped to 1-10. Show a circular score gauge.
9. **Duration stepper** - start `1.5`, step `0.5`, min `1.5`. Shows live `cost = durationHours * student.hourlyRate` for internal use.
10. **Save** - calls `createSession(...)` with `status: "DONE"`.
11. **Close-out sheet** - appears after save for homework, follow-ups, and parent WhatsApp message.

## `lib/foto.ts`

```ts
import imageCompression from "browser-image-compression";
import { PHOTO_MAX_PX } from "../db/types";

export async function compressPhoto(file: File): Promise<Blob> {
  return imageCompression(file, {
    maxWidthOrHeight: PHOTO_MAX_PX,
    maxSizeMB: 0.4,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.8,
  });
}

export function blobUrl(blob?: Blob): string | undefined {
  return blob ? URL.createObjectURL(blob) : undefined;
}
```

Always `URL.revokeObjectURL(url)` on cleanup to avoid leaks.

## Save Logic

```ts
async function onSave() {
  if (!studentId || !shortNote.trim()) {
    showError("Lengkapi murid dan catatan.");
    return;
  }

  await createSession({
    studentId,
    date,
    durationHours: duration,
    subjects: subjects.length > 0 ? subjects : [],
    photo,
    shortNote: shortNote.trim(),
    mood,
    topic,
    needsWork,
    predictedGrade,
    engagement: buildEngagementLog(),
    status: "DONE",
  });

  openCloseOutSheet();
}
```

`createSession` computes `rateSnapshot`, `cost`, `createdAt`, and `updatedAt`.

## Session Brief

When a student is selected, show a preparation panel:

- **Last session** - date, subjects, short note, topic, predicted grade.
- **Pending homework** - undone or overdue homework for this student.
- **Pending follow-ups** - action items from previous sessions.

This gives the tutor context before starting the session.

## Close-Out Sheet

After saving a session, a bottom sheet appears:

1. **Add Follow-up Items** - action items for next session, prefilled from `needsWork` when available. Jenis follow-up: "continue-topic", "misconception", "send-resource", "other".
2. **Add Follow-up Items** - free text action items for next session, prefilled from `needsWork` when available.
3. **WhatsApp Message** - auto-generated message to the parent with session summary, subjects, duration, homework list, and follow-up focus areas.
4. **Done** - saves homework and follow-ups, then closes the sheet.

## Autocomplete

```ts
const allNotes = useLiveQuery(() => recentShortNotes(50), []);
const suggestions = (allNotes ?? [])
  .filter((n) => n.toLowerCase().includes(shortNote.toLowerCase()) && n !== shortNote)
  .slice(0, 5);
```

Clicking a suggestion fills the textarea. This is local-only and does not call AI.

## Acceptance

- Saving creates a `sessions` row with `subjects`, `photo`, `shortNote`, optional structured fields, optional `engagement`, and `status: "DONE"`.
- `cost === durationHours * rateSnapshot`; `rateSnapshot` is stored.
- Date can be backdated within the allowed 14-day window.
- Typing in the note shows up to 5 suggestions from past notes.
- Session brief shows last session, pending homework, and pending follow-ups.
- Close-out dapat membuat follow-up items dan generate pesan WhatsApp.
- Works with the network disabled.

## Note on AI

AI is not called here. It runs later at report-generation time (`06-ai-generation.md`). Capture stays instant and offline.




