/**
 * Gerbang PIN Keuangan — formulir sungguhan, bukan kolom isian dengan penangan
 * tombol Enter yang ditempel.
 *
 * G3-02 #10. Dua hal yang diperbaiki:
 *
 * 1. **Enter mengirim.** Dulu kolomnya `<input>` lepas dengan `onKeyDown` yang
 *    memanggil `unlock()` sendiri — artinya Enter hanya bekerja di kolom itu,
 *    dan pembaca layar tidak melihatnya sebagai formulir. Sekarang `<form>` +
 *    `onSubmit`, jadi Enter bekerja dari mana pun di dalam formulir, tombolnya
 *    berjenis `submit`, dan perilaku bawaannya benar.
 *
 * 2. **Hitungan mundur terlihat, dan tombolnya mati selama menunggu.** Pesan
 *    "Tunggu N detik." dari `useMoneyVisible` hanya muncul **setelah** percobaan
 *    gagal. Kalau tutor menutup dan membuka layar lagi, ia melihat kolom yang
 *    tampak siap dipakai padahal masih terkunci — dan tiap percobaan hanya
 *    menambah masa tunggu. Di sini sisa waktunya dihitung berkala dari
 *    `getPinLockoutDelay()` sehingga tidak pernah bertentangan dengan
 *    penegakan lockout yang sebenarnya, dan tombol kirim dinonaktifkan selama
 *    masih menunggu.
 */
import { useEffect, useState, type FormEvent } from "react";
import { sisaDetikLockout } from "../../lib/pinLockout";

const PANJANG_PIN = 6;

interface PinGateFormProps {
  /** Coba buka dengan PIN ini. Mengembalikan true bila berhasil. */
  onUnlock: (pin: string) => Promise<boolean>;
  /** Pesan galat terakhir dari `useMoneyVisible` (mis. "PIN salah."). */
  error: string;
  /** Bersihkan pesan galat begitu tutor mengetik lagi. */
  onClearError: () => void;
  onKembali: () => void;
}

export default function PinGateForm({
  onUnlock, error, onClearError, onKembali,
}: PinGateFormProps) {
  const [pin, setPin] = useState("");
  const [menunggu, setMenunggu] = useState(() => sisaDetikLockout());
  const [mengirim, setMengirim] = useState(false);

  // Hitung sisa masa tunggu berkala. Berhenti sendiri saat sudah nol supaya
  // tidak ada timer yang jalan terus di layar yang sudah bisa dipakai.
  useEffect(() => {
    if (menunggu <= 0) return;
    const id = window.setInterval(() => {
      const sisa = sisaDetikLockout();
      setMenunggu(sisa);
      if (sisa <= 0) window.clearInterval(id);
    }, 500);
    return () => window.clearInterval(id);
  }, [menunggu]);

  const terkunci = menunggu > 0;
  const bisaKirim = pin.length === PANJANG_PIN && !terkunci && !mengirim;

  const kirim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bisaKirim) return;
    setMengirim(true);
    try {
      const berhasil = await onUnlock(pin);
      if (berhasil) setPin("");
      else setMenunggu(sisaDetikLockout());
    } finally {
      setMengirim(false);
    }
  };

  const pesanGalat = terkunci ? `Tunggu ${menunggu} detik.` : error;

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-4xl" aria-hidden="true">🔐</p>
      <p className="font-bold text-lg text-[var(--ink-strong)]">Data Keuangan</p>
      <p className="text-sm text-[var(--ink-muted)] text-center">
        Masukkan PIN Keuangan. Sekali dibuka, angka uang juga terbuka di layar lain sampai dikunci lagi.
      </p>

      <form onSubmit={(event) => void kirim(event)} className="flex flex-col items-center gap-3">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={PANJANG_PIN}
          placeholder="PIN (6 digit)"
          aria-label="PIN Keuangan (6 digit)"
          aria-describedby="pin-gate-pesan"
          aria-invalid={Boolean(pesanGalat)}
          disabled={terkunci || mengirim}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, "").slice(0, PANJANG_PIN));
            onClearError();
          }}
          className="input text-center tracking-widest text-xl w-40"
          autoFocus
        />
        {/* Satu tempat untuk kedua jenis pesan supaya pembaca layar tidak
            kehilangan jejak antara "PIN salah" dan "Tunggu N detik". */}
        <p
          id="pin-gate-pesan"
          role={pesanGalat ? "alert" : undefined}
          aria-live="assertive"
          className={`min-h-[1.25rem] text-sm ${pesanGalat ? "text-[var(--ink-danger)]" : "text-[var(--ink-muted)]"}`}
        >
          {pesanGalat}
        </p>
        <button
          type="submit"
          disabled={!bisaKirim}
          className="px-8 py-3 rounded-xl bg-[var(--brand-solid)] text-[var(--on-strong)] font-bold text-sm transition-colors hover:bg-[var(--brand-solid)] disabled:opacity-40"
        >
          {mengirim ? "Membuka..." : "Buka"}
        </button>
      </form>

      <button
        type="button"
        onClick={onKembali}
        className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink-muted)]"
      >
        ← Kembali
      </button>
    </div>
  );
}
