import { useState, useRef, useEffect } from "react";
import { compressPhoto, stampPhoto } from "../lib/foto";

/**
 * Hook untuk kamera/gallery photo capture dengan kompresi + timestamp stamp.
 * Mengelola Blob → objectURL lifecycle dan cleanup.
 */
export function usePhotoCapture(sessionDate: string) {
  const [photo, setPhoto] = useState<Blob | undefined>();
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [signature, setSignature] = useState<Blob | undefined>();
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>();
  const [showSigPad, setShowSigPad] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount or change
  useEffect(() => {
    if (!photo) { setPhotoUrl(undefined); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!signature) { setSignatureUrl(undefined); return; }
    const url = URL.createObjectURL(signature);
    setSignatureUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [signature]);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, setMessage: (msg: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("File harus berupa gambar (JPG/PNG/WebP).");
      e.target.value = ""; return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage("Foto terlalu besar (maks 50 MB)");
      e.target.value = ""; return;
    }
    try {
      const compressed = await compressPhoto(file);
      const stamped    = await stampPhoto(compressed, sessionDate);
      setPhoto(stamped);
    } catch { setMessage("Gagal kompres foto"); }
    e.target.value = "";
  };

  const resetPhoto = () => {
    setPhoto(undefined);
    setSignature(undefined);
    setShowSigPad(false);
  };

  return {
    photo, photoUrl, signature, signatureUrl,
    showSigPad, setShowSigPad, setSignature,
    cameraRef, galleryRef,
    handlePhoto, resetPhoto,
  };
}
