import { useCallback } from "react";
import { createStudent, updateStudent } from "../db/repos";
import type { StudentBillingUpdateOptions } from "../db/repos";
import { useToastCtx } from "../components/ToastProvider";
import type { Student } from "../db/types";

interface UseStudentEditorResult {
  /**
   * Menyimpan murid baru atau perubahan murid lama.
   *
   * `editing` menentukan jalurnya: `null`/`undefined` = buat baru, selebihnya
   * memperbarui murid itu. Mengembalikan id murid yang terpengaruh supaya
   * pemanggil bisa bereaksi (mis. membuka murid yang baru dibuat).
   */
  saveStudent: (
    data: Omit<Student, "id">,
    options?: StudentBillingUpdateOptions,
    editing?: Student | null,
  ) => Promise<string>;
}

/**
 * Satu jalur tulis untuk menyimpan profil murid.
 *
 * Diekstrak dari `Students.tsx` pada butir 11 G3-06. Alasannya bukan kerapian:
 * layar Daftar Murid dan layar Detail Murid sama-sama menawarkan penyuntingan
 * profil, dan **dua jalur tulis untuk data yang sama adalah sumber
 * ketidakkonsistenan** — misalnya satu layar mengirim opsi siklus tagihan dan
 * yang lain lupa.
 *
 * Yang TIDAK dipindahkan ke sini: keputusan kapan modal dibuka dan apa yang
 * terjadi sesudahnya. Itu urusan layar masing-masing.
 */
export function useStudentEditor(): UseStudentEditorResult {
  const toast = useToastCtx();

  const saveStudent = useCallback(async (
    data: Omit<Student, "id">,
    options?: StudentBillingUpdateOptions,
    editing?: Student | null,
  ): Promise<string> => {
    if (editing) {
      await updateStudent(editing.id, data, options);
      toast.success(`Profil "${data.name}" diperbarui ✓`);
      return editing.id;
    }
    const id = await createStudent(data);
    toast.success(`Murid "${data.name}" ditambahkan ✓`);
    return id;
  }, [toast]);

  return { saveStudent };
}
