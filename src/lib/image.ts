"use client";

export const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/**
 * Verkleint een foto in de browser en slaat hem op als WebP. Opnieuw tekenen
 * op een canvas laat EXIF-gegevens (zoals GPS-locatie) achter: belangrijk
 * omdat foto's van klussen vaak thuis worden gemaakt.
 */
export async function prepareImage(file: File, maxSide: number): Promise<Blob> {
  if (!ACCEPTED_IMAGES.includes(file.type)) throw new Error("Gebruik een JPG-, PNG- of WebP-foto.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Deze foto is groter dan 15 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Je browser kan deze foto niet verwerken.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("Je browser kan deze foto niet verwerken.");
  return blob;
}
