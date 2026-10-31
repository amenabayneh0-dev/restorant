/** Browser-only: shrinks a photo to at most `max` px on the long side and re-encodes it (WebP, falling back to JPEG). */
export async function resizeImage(file: File, max = 1600, quality = 0.82): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file; // let the server explain the problem
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d"); if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  for (const type of ["image/webp", "image/jpeg"]) {
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, type, quality));
    if (blob && blob.type === type) {
      if (blob.size >= file.size && scale === 1) return file; // already small and compact
      return new File([blob], file.name.replace(/\.\w+$/, "") + (type === "image/webp" ? ".webp" : ".jpg"), { type });
    }
  }
  return file;
}
