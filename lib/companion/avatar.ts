/**
 * "Use my own picture" for the companion.
 *
 * The picture never leaves the device. It is shrunk to a small square and kept
 * in this browser's storage: no upload, no account, nothing for anyone to
 * moderate or pay to host. On another device the cat is shown until the user
 * picks a picture there too.
 */

const KEY = "sd-avatar";
const SIZE = 256;
const listeners = new Set<() => void>();

export function readAvatar(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function subscribeAvatar(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

function write(value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    // Storage full or blocked: the picture simply is not remembered.
  }
  listeners.forEach((notify) => notify());
}

export const clearAvatar = () => write(null);

/** Crops the chosen file to a centred square, shrinks it, and saves it. */
export async function saveAvatar(file: File): Promise<{ ok: boolean; message?: string }> {
  if (!file.type.startsWith("image/")) return { ok: false, message: "That file is not a picture." };
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
    write(canvas.toDataURL("image/jpeg", 0.82));
    return { ok: true };
  } catch {
    return { ok: false, message: "That picture could not be opened. Try a JPEG or PNG." };
  }
}
