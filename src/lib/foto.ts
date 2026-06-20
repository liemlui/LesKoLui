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
