# PANDUAN PENUNTASAN — Refactor Catat Sesi (CaptureSession.tsx)

> **Untuk:** AI executor. Kerjakan BERURUTAN.
> **Status:** v1.64.0 parsial — 358/358 test lulus.

---

## 0. ATURAN KERAS

1. JANGAN edit source via Get-Content/Set-Content atau redirect `>` — PS 5.1 rusak UTF-8
2. Cara aman: tool edit bawaan agent, atau Node.js stdin pipe
3. JANGAN ubah teks tombol user, isi src/lib/, src/db/
4. JANGAN refactor di luar tugas ini
5. Setiap tugas punya VERIFIKASI

---

## 1. BASELINE

```cmd
cd les-ko-lui
npm test
```
Harus 358 passed. Kalau tidak, BERHENTI.

Buat checkpoint:
```cmd
git add -A
git commit -m "checkpoint: v1.64.0 parsial (sebelum penuntasan)"
```

File yang diedit:
- `src/screens/captureSession/useEngagement.ts`
- `src/screens/CaptureSession.tsx`
- `src/lib/version.ts`
- `TODO.md`

---

## 2. TUGAS P0-1 — Perbaiki bug di `useEngagement.ts`

**File:** `src/screens/captureSession/useEngagement.ts`

### 2a. Bug: score hanya dihitung saat `touched`

CARI baris:
```
  const score = touched
    ? calcEngagementScore({
```
GANTI:
```
  const score = hasEngagementInput
    ? calcEngagementScore({
```
Alasan: komponen asli menghitung skor saat ada input APAPUN (mood/tag/respons),
bukan hanya saat 12 flag disentuh.

### 2b. Tambah method `applyPreset`

CARI:
```
  const resetEngagementFlags = useCallback(() => {
    setFlags(INITIAL);
    setMood(undefined);
  }, []);
```
SIMPAN SETELAH blok itu:
```
  const applyPreset = useCallback((pattern: Partial<EngagementState>, nextMood?: string) => {
    setFlags({ ...INITIAL, ...pattern });
    setMood(nextMood);
  }, []);
```

### 2c. Ekspor `applyPreset` di return

CARI:
```
    toggleFlag, resetEngagementFlags, resetAll,
```
GANTI:
```
    toggleFlag, applyPreset, resetEngagementFlags, resetAll,
```

### 2d. Verifikasi P0-1

```cmd
npx tsc --noEmit -p tsconfig.app.json
```
Harus 0 error. Lanjut.

---

## 3. TUGAS P0-2 — Integrasikan `useEngagement` ke `CaptureSession.tsx`

**Strategi: alias-destructure.** Nama variabel lama TETAP dipakai — JSX tidak diubah.

**File:** `src/screens/CaptureSession.tsx`

### 3a. Tambah import

SETELAH `import { Z } from "../lib/zIndex";` tambah:
```
import useEngagement from "./captureSession/useEngagement";
```

### 3b. Hapus useState mood

CARI satu baris:
```
  const [mood,           setMood]            = useState<string | undefined>();
```
HAPUS.

### 3c. Ganti blok engagement dengan hook

CARI blok ini (12 useState + engTouched):
```
  // Engagement indicators
  const [engPrepared,       setEngPrepared]       = useState(false);
  const [engFocused,        setEngFocused]        = useState(false);
  ...
  const [engOffTask,        setEngOffTask]        = useState(false);
  // Situasi humanis hari ini (opsional)
  const [situasiNote,       setSituasiNote]       = useState("");
  const engTouched = engPrepared || engFocused || ...
      engRestless || engOffTask;
```
GANTI dengan:
```
  // Engagement — satu hook; nama variabel di-alias agar JSX tetap jalan
  const {
    flags: { prepared: engPrepared, focused: engFocused, drowsy: engDrowsy,
      playingPhone: engPhone, activeAsking: engActiveAsking, quickLearner: engQuickLearner,
      needsRepetition: engNeedsRepeat, hwMissed: engHwMissed, late: engLate,
      bathroomBreaks: engBathroom, restless: engRestless, offTask: engOffTask },
    mood, setMood,
    behaviorTags, setBehaviorTags,
    responseTag, setResponseTag,
    showBehavior, setShowBehavior,
    activeTooltip, setActiveTooltip,
    situasiNote, setSituasiNote,
    touched: engTouched, hasEngagementInput,
    score: engScore, scoreInfo: engScoreInfo,
    toggleFlag, applyPreset, resetEngagementFlags, resetAll,
  } = useEngagement();
```

### 3d. Hapus blok behavior/response useState

HAPUS:
```
  // Behavior & response taxonomy tags
  const [behaviorTags,   setBehaviorTags]   = useState<string[]>([]);
  const [responseTag,    setResponseTag]    = useState<string | undefined>();
  const [showBehavior,   setShowBehavior]   = useState(false);
  const [activeTooltip,  setActiveTooltip]  = useState<{...}>;
```

### 3e. Hapus hasEngagementInput manual

HAPUS 5 baris komentar + perhitungan `hasEngagementInput`.

### 3f. Hapus engScore/engScoreInfo manual

HAPUS blok `const engScore = hasEngagementInput ? calcEngagementScore({...}) : 0;`
(~10 baris). Perhatian: bagian `score:` dalam `handleSave` TIDAK dihapus.

### 3g. Ganti 12 onClick toggle

Table (CARI → GANTI, masing-masing 1 baris):

| CARI | GANTI |
|---|---|
| `onClick={() => setEngPrepared(!engPrepared)}` | `onClick={() => toggleFlag("prepared")}` |
| `onClick={() => setEngFocused(!engFocused)}` | `onClick={() => toggleFlag("focused")}` |
| `onClick={() => setEngActiveAsking(!engActiveAsking)}` | `onClick={() => toggleFlag("activeAsking")}` |
| `onClick={() => setEngQuickLearner(!engQuickLearner)}` | `onClick={() => toggleFlag("quickLearner")}` |
| `onClick={() => setEngPhone(!engPhone)}` | `onClick={() => toggleFlag("playingPhone")}` |
| `onClick={() => setEngDrowsy(!engDrowsy)}` | `onClick={() => toggleFlag("drowsy")}` |
| `onClick={() => setEngNeedsRepeat(!engNeedsRepeat)}` | `onClick={() => toggleFlag("needsRepetition")}` |
| `onClick={() => setEngHwMissed(!engHwMissed)}` | `onClick={() => toggleFlag("hwMissed")}` |
| `onClick={() => setEngLate(!engLate)}` | `onClick={() => toggleFlag("late")}` |
| `onClick={() => setEngBathroom(!engBathroom)}` | `onClick={() => toggleFlag("bathroomBreaks")}` |
| `onClick={() => setEngRestless(!engRestless)}` | `onClick={() => toggleFlag("restless")}` |
| `onClick={() => setEngOffTask(!engOffTask)}` | `onClick={() => toggleFlag("offTask")}` |

Nama flag != nama variabel untuk 2 kasus: `engPhone` -> `"playingPhone"`, `engBathroom` -> `"bathroomBreaks"`.

### 3h. Ganti 4 tombol preset

Tombol ✨ Lancar:
```
onClick={() => applyPreset({ prepared: true, focused: true, activeAsking: true }, "Fokus")}
```

Tombol 😐 Biasa:
```
onClick={() => applyPreset({}, "Biasa")}
```

Tombol 😴 Kurang Fit:
```
onClick={() => applyPreset({ drowsy: true }, "Lelah")}
```

Tombol 🔄 Reset:
```
onClick={resetEngagementFlags}
```

### 3i. Ganti resetForm

CARI `const resetForm = () => { ... setSituasiNote(""); ...`
GANTI dengan versi yang memanggil `resetAll()` alih-alih 20+ setState.

### 3j. Verifikasi P0-2

```cmd
npx tsc --noEmit -p tsconfig.app.json
```
Jika error `setEng*` masih ada — cari sisa `setEng` di file, harus NOL.


---

## 4. TUGAS P0-3 — Integrasikan `useStudentBrief`

**File:** `src/screens/CaptureSession.tsx`

### 4a. Tambah import
SETELAH import useEngagement:
```
import useStudentBrief from "./captureSession/useStudentBrief";
```

### 4b. Hapus 2 useState brief (atas)
CARI:
```
  const [currentStudent, setCurrentStudent] = useState<Student | undefined>();
  const [studentSubjects,setStudentSubjects] = useState<string[]>([]);
```
HAPUS kedua baris.

### 4c. Hapus 2 useState brief (bawah)
CARI:
```
  const [briefLastSession, setBriefLastSession] = useState<Session | undefined>();
  const [briefFollowUps,   setBriefFollowUps]   = useState<FollowUpItem[]>([]);
```
HAPUS. JANGAN hapus `briefFollowPage` dibawahnya.

### 4d. Panggil hook
SETELAH `const [subjects, setSubjects] = useState<string[]>([]);`
tambah:
```
  const { currentStudent, studentSubjects, briefLastSession, briefFollowUps } = useStudentBrief(studentId);
```

### 4e. Hapus efek lama
CARI blok ~15 baris `useEffect(() => { ... Promise.all([getStudent(studentId), ...`
GANTI dengan:
```
  useEffect(() => { setSubjects([]); }, [studentId]);
```

### 4f. Bersihkan import repos
CARI import:
```
import { listStudents, getStudent, createSession, ... } from "../db/repos";
```
HAPUS `getStudent, getLastDoneSession, listPendingFollowUps` dari import.

### 4g. Verifikasi P0-3
```cmd
npx tsc --noEmit -p tsconfig.app.json
```
Hapus type import yang unused.

---

## 5. TUGAS P0-4 — Perbaiki changelog

**File:** `src/lib/version.ts`

CARI:
```
      "Refactor: hooks useEngagement & useStudentBrief memangkas ~30 useState inline"
```
GANTI:
```
      "Refactor: 22 useState inline dipindahkan ke hooks useEngagement & useStudentBrief"
```

---

## 6. TUGAS P0-5 — Verifikasi penuh

```cmd
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm test
npm run build
```
Kriteria:
- tsc: 0 error
- lint: 0 error / 0 warning
- test: 358 passed
- build: sukses, dist/sw.js dibuat

---

## 7. TUGAS P0-6 — Update TODO.md

**File:** `TODO.md`

CARI `### CaptureSession.tsx 🟡 1 hook extracted`
GANTI `### CaptureSession.tsx 🟢 3 hooks extracted`

CARI:
```
- [ ] Extract `useStudentBrief` — load last session, HW, follow-ups on student change
- [ ] Extract `useEngagement` — 13 state vars + score derivation + reset
```
GANTI:
```
- [x] Extract `useStudentBrief` — load last session, HW, follow-ups on student change
- [x] Extract `useEngagement` — 13 state vars + score derivation + reset
```

---

## 8. TUGAS P1 — UI polish (OPSIONAL, hanya jika P0 semua lulus)

### P1-1. Tombol Nanti Saja jadi sekunder
CARI: `className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm"`
GANTI: `className="w-full py-2.5 rounded-xl border border-gray-300 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"`

### P1-2. Warna 12 tombol engagement konsisten
Aturan: Positif (4 tombol) aktif = green-600. Negatif (8 tombol) aktif = rose-600.

12 replacement (CARI → GANTI):

| Tombol | Warna Lama | Warna Baru |
|---|---|---|
| Sudah siap | bg-green-500 / border-green-500 | bg-green-600 / border-green-600 |
| Sangat fokus | bg-blue-500 / border-blue-500 | bg-green-600 / border-green-600 |
| Aktif bertanya | bg-teal-500 / border-teal-500 | bg-green-600 / border-green-600 |
| Cepat paham | bg-purple-500 / border-purple-500 | bg-green-600 / border-green-600 |
| Main HP | bg-red-500 / border-red-500 | bg-rose-600 / border-rose-600 |
| Mengantuk | bg-orange-500 / border-orange-500 | bg-rose-600 / border-rose-600 |
| Perlu diulang | bg-yellow-500 / border-yellow-500 | bg-rose-600 / border-rose-600 |
| PR tidak buat | bg-rose-500 / border-rose-500 | bg-rose-600 / border-rose-600 |
| Telat | bg-red-500 / border-red-500 | bg-rose-600 / border-rose-600 |
| Sering ke toilet | bg-pink-500 / border-pink-500 | bg-rose-600 / border-rose-600 |
| Gelisah loncat | bg-orange-500 / border-orange-500 | bg-rose-600 / border-rose-600 |
| Sibuk sendiri | bg-amber-500 / border-amber-500 | bg-rose-600 / border-rose-600 |

Juga samakan hover: positif → hover:border-green-300; negatif → hover:border-rose-300.

### P1-3. Chip durasi scroll horizontal
CARI: `<div className="flex flex-wrap gap-2">` (dalam DURATIONS.map)
GANTI: `<div className="flex gap-2 overflow-x-auto pb-1">`
Tambahkan `flex-shrink-0` ke setiap button chip durasi.

### P1-4. Tipografi naik
Ganti SEMUA `text-[10px]` → `text-xs` dan `text-[11px]` → `text-xs` di CaptureSession.tsx.
Verifikasi: tidak boleh ada lagi `text-[10px]` atau `text-[11px]` di file.

### P1-5. Verifikasi ulang
Ulangi TUGAS P0-5.

---

## 9. CHECKLIST AKHIR

- [ ] P0-1 hook dibenarkan (hasEngagementInput + applyPreset)
- [ ] P0-2 useEngagement terintegrasi; tidak ada setEng* tersisa di file
- [ ] P0-3 useStudentBrief terintegrasi; tidak ada getStudent di import CaptureSession
- [ ] P0-4 changelog akurat
- [ ] P0-5 lint 0/0 . test 358/358 . build OK
- [ ] P0-6 TODO.md tercentang
- [ ] (P1 jika dikerjakan) verifikasi ulang
- [ ] Commit: `git add -A && git commit -m "v1.64.1: integrasi hook engagement & brief"`
- [ ] Bump versi `package.json` → `1.64.1`

## 10. ROLLBACK

```cmd
git log --oneline -3
git reset --hard <hash-checkpoint>
```
Laporkan langkah terakhir yang berhasil sebelum berhenti.
