const TARGET_SIZE = 500 * 1024; // 500KB
const MAX_DIMENSION = 1024;

/**
 * 画像を最大500KBに圧縮して返す。
 * Canvas で縮小し、JPEG quality を段階的に下げて目標サイズに収める。
 */
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  // リサイズ計算
  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // quality を下げながら目標サイズ以下になるまで繰り返す
  for (let q = 0.9; q >= 0.1; q -= 0.1) {
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: q });
    if (blob.size <= TARGET_SIZE || q <= 0.1) {
      return new File([blob], "avatar.jpg", { type: "image/jpeg" });
    }
  }

  // フォールバック（到達しないはず）
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.1 });
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}
