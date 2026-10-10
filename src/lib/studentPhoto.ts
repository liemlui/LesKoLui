/**
 * Aturan murni untuk tampilan foto murid (G3-07).
 *
 * Dipisah dari komponennya karena dua alasan yang sudah pernah memakan waktu di
 * repo ini: (a) berkas komponen tidak boleh mengekspor fungsi biasa
 * (`react-refresh/only-export-components`), dan (b) repo ini tidak memasang
 * jsdom sehingga komponen tidak bisa dirender di suite — yang bisa diuji adalah
 * aturan murninya, di sini.
 */

/**
 * Huruf yang ditampilkan saat murid belum punya foto.
 *
 * Mengembalikan "?" bila namanya kosong atau hanya berisi spasi — bukan string
 * kosong, supaya avatar tidak pernah tampak sebagai lingkaran warna tanpa isi
 * yang terlihat seperti gambar yang gagal dimuat.
 */
export function studentInitial(name: string | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}
