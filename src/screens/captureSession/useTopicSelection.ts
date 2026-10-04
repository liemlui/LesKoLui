import { useMemo, useState } from "react";
import { browseTopicsForSubjects, searchTopicsExpanded } from "../../lib/ibTopics";
import type { TopicSearchResponse } from "../../lib/ibTopics";
import { mergeTopics, mergeTopicUnits, recentTopics } from "./helpers";
import type { Session, Student } from "../../db/types";

interface UseTopicSelectionParams {
  subjects: string[];
  studentSubjects: string[];
  student?: Student;
  recentSessions: Session[];
}

/** State dan aksi topik untuk wizard Catat Sesi; draf tetap dimiliki layar induk. */
export default function useTopicSelection({
  subjects, studentSubjects, student, recentSessions,
}: UseTopicSelectionParams) {
  const [topics, setTopics] = useState<string[]>([]);
  /** Bab katalog untuk tiap topik terpilih (audit P1 #9). Topik yang diketik
   *  bebas tidak punya entri di sini → `topicUnit` tersimpan kosong. */
  const [topicUnits, setTopicUnits] = useState<Record<string, string>>({});
  const [topicSearch, setTopicSearch] = useState("");
  const [topicResponse, setTopicResponse] = useState<TopicSearchResponse | null>(null);
  const [topicAllowOffLevel, setTopicAllowOffLevel] = useState(false);
  /** Panel "pilih dari daftar bab" **terbuka sejak awal** (2026-10-04, G3-01):
   *  sebelum ini isinya hanya bisa dibaca setelah satu ketukan pada tombolnya,
   *  padahal `browseGroups` menarik katalog mapel itu dari 1.538 topik — jalur
   *  "baca pilihan" jadi satu ketukan lebih jauh daripada jalur "ingat kata
   *  kunci". Daftar bab tetap bisa ditutup tutor lewat tombol yang sama. */
  const [showBrowse, setShowBrowse] = useState(true);
  const [openUnit, setOpenUnit] = useState<string | null>(null);

  const topicResults = topicResponse?.results ?? [];
  const topicMeta = topicResponse?.meta;
  const topicOffLevel = Boolean(topicMeta?.offLevelFallback);
  // Topik bisa lebih dari satu: gabungan topik yang sudah dipilih (chips) +
  // teks pencarian yang belum di-commit, dipisah dengan "; " (lihat
  // `mergeTopics` — aturan itu tinggal di `helpers.ts` supaya penyimpanan &
  // pemulihan draf tidak pernah berbeda tafsir).
  const topic = useMemo(() => mergeTopics(topics, topicSearch), [topics, topicSearch]);
  // Kalau mapel terpilih lebih dari satu, jangan bias pencarian ke satu mapel saja.
  const topicSearchSubject = subjects.length >= 2 ? undefined : subjects[0] ?? studentSubjects[0];
  /** Satu pintu masuk pencarian topik: selalu segarkan hasil + metanya.
   *  Meta dipakai agar hasil di jenjang kurikulum lain tidak tampil seolah
   *  normal (cacat T-03). */
  const topicSearchOptions = {
    subject: topicSearchSubject,
    grade: student?.grade,
    curriculum: student?.curriculum,
  };
  const runTopicSearch = (query: string) => {
    setTopicSearch(query);
    setTopicAllowOffLevel(false);
    setTopicResponse(query.trim() ? searchTopicsExpanded(query, topicSearchOptions) : null);
  };

  // ── Pilih topik dari daftar bab (audit P1 #7) ──────────────────────────────
  //
  // Kotak pencarian menuntut tutor sudah tahu kata kuncinya; `browseTopics…`
  // memberi daftar untuk DIBACA. Isi daftar dihitung "atas permintaan" (saat
  // panel dibuka), bukan setiap render: `browseTopicsForSubjects` menyaring
  // seluruh 1.538 topik.
  //
  // `subjects` dialokasikan ulang tiap render, jadi `useMemo` tidak boleh
  // bergantung pada array itu langsung. Dipakai kunci gabungan (pemisah NUL —
  // karakter yang tidak mungkin muncul di nama mapel) supaya katalog tidak
  // terbuka ulang tiap render sekaligus aturan exhaustive-deps tetap terpenuhi.
  const browseSubjects = subjects.length > 0 ? subjects : studentSubjects;
  const browseSubjectsKey = browseSubjects.join("\u0000");
  const browseGrade = student?.grade;
  const browseCurriculum = student?.curriculum;
  const browseGroups = useMemo(
    () => (showBrowse && browseSubjectsKey
      ? browseTopicsForSubjects(browseSubjectsKey.split("\u0000"), browseGrade, browseCurriculum)
      : []),
    [showBrowse, browseSubjectsKey, browseGrade, browseCurriculum],
  );
  /** Bab untuk tiap topik terpilih — gabungan bab unik, urut kemunculan. */
  const topicUnit = useMemo(() => mergeTopicUnits(topics, topicUnits), [topics, topicUnits]);
  /** "Topik sesi lalu" murid ini (audit P1 #8): 90% sesi membahas topik yang
   *  berdekatan dengan sesi sebelumnya, dan satu ketukan jauh lebih cepat
   *  daripada mengingat lalu mengetik ulang. */
  const recentTopicChips = useMemo(() => recentTopics(recentSessions, 6), [recentSessions]);

  /**
   * Tambah satu topik. `unit` diisi bila topik dipilih dari daftar bab katalog
   * (audit P1 #9) — topik yang diketik bebas tidak punya bab.
   */
  const addTopic = (raw: string, unit?: string) => {
    const clean = raw.trim();
    if (!clean) return;
    setTopics((previous) => (previous.includes(clean) ? previous : [...previous, clean]));
    if (unit) setTopicUnits((previous) => (previous[clean] ? previous : { ...previous, [clean]: unit }));
    setTopicSearch("");
    setTopicResponse(null);
    setTopicAllowOffLevel(false);
  };
  const addTopicsFromInput = () => {
    const parts = topicSearch.split(";").map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setTopics((previous) => {
      const next = [...previous];
      for (const part of parts) if (!next.includes(part)) next.push(part);
      return next;
    });
    setTopicSearch("");
    setTopicResponse(null);
    setTopicAllowOffLevel(false);
  };
  const removeTopic = (topicName: string) => {
    setTopics((previous) => previous.filter((item) => item !== topicName));
    setTopicUnits((previous) => {
      if (!(topicName in previous)) return previous;
      const next = { ...previous };
      delete next[topicName];
      return next;
    });
  };

  return {
    topics, setTopics, topicUnits, setTopicUnits, topicSearch, setTopicSearch,
    topicResponse, setTopicResponse, topicAllowOffLevel, setTopicAllowOffLevel,
    topicResults, topicMeta, topicOffLevel, topic, runTopicSearch,
    showBrowse, setShowBrowse, openUnit, setOpenUnit, browseSubjects, browseGroups,
    topicUnit, recentTopicChips, addTopic, addTopicsFromInput, removeTopic,
  };
}
