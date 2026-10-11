import type { NguImageOptions } from './types';

/** The part of the source image to keep, in its own pixels. */
export interface CropRect {
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
}

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ngu-form: the image could not be read'));
    img.src = url;
  });
}

/** The chosen format; PNG stays PNG (it may be transparent), anything else becomes JPEG. */
export function outputType(file: File, options: NguImageOptions): string {
  return options.output ?? (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
}

/**
 * Draws `rect` of the image, scaled down to `maxWidth` and `maxHeight`, into a new file.
 * Without canvas support the original file is returned.
 */
export async function renderImage(
  img: HTMLImageElement,
  rect: CropRect,
  file: File,
  options: NguImageOptions,
): Promise<File> {
  const k = Math.min(
    1,
    (options.maxWidth ?? Infinity) / rect.sw,
    (options.maxHeight ?? Infinity) / rect.sh,
  );
  const width = Math.max(1, Math.round(rect.sw * k));
  const height = Math.max(1, Math.round(rect.sh * k));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }
  const type = outputType(file, options);
  if (type === 'image/jpeg') {
    // JPEG has no transparency; paint transparent areas white rather than black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, options.quality ?? 0.9),
  );
  if (!blob) {
    return file;
  }
  const name = `${file.name.replace(/\.[^./]+$/, '')}.${EXTENSIONS[type] ?? 'img'}`;
  return new File([blob], name, { type, lastModified: Date.now() });
}

/** Scales an image down to `maxWidth` and `maxHeight`, or converts it to `output`, without cropping. */
export async function processImage(file: File, options: NguImageOptions): Promise<File> {
  if (options.maxWidth == null && options.maxHeight == null && !options.output) {
    return file;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const rect = { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
    const fits =
      rect.sw <= (options.maxWidth ?? Infinity) && rect.sh <= (options.maxHeight ?? Infinity);
    return fits && (!options.output || options.output === file.type)
      ? file
      : await renderImage(img, rect, file, options);
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
