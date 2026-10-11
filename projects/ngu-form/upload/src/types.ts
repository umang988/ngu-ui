/** A file stored by your server, as your upload function describes it. */
export interface NguUploadedFile {
  readonly name: string;
  /** Size in bytes. */
  readonly size?: number;
  /** MIME type, such as `image/png`. */
  readonly type?: string;
  /** Where the file can be fetched; image files with a `url` get a thumbnail. */
  readonly url?: string;
  readonly id?: string | number;
}

/** A file field holds `File` objects, or what `upload` returned for them. */
export type NguFileValue = File | NguUploadedFile;

/** Passed to an upload function. */
export interface NguUploadContext {
  /** Reports progress from 0 to 1. */
  progress(fraction: number): void;
  /** Aborted when the user removes the file, or the form resets. */
  readonly signal: AbortSignal;
}

/**
 * Uploads one file and describes the stored result. Throw (or reject) to mark the upload as
 * failed; the user can retry it.
 */
export type NguUploadFn = (file: File, context: NguUploadContext) => Promise<NguUploadedFile>;

/** Options of `type: 'file'` fields. `min` and `max` count files on list values. */
export interface NguFileOptions {
  /** Accepted types, as the `accept` attribute: `'image/*,.pdf'`. Dropped files are checked too. */
  accept?: string;
  /** Largest file, in bytes. */
  maxSize?: number;
  /**
   * Uploads each file as soon as it is chosen; the value then holds what it returns, and a
   * submit waits for uploads that are still running. Without it, the value holds `File` objects.
   */
  upload?: NguUploadFn;
}

/** Options of `type: 'image'` fields: a file field that crops and resizes images first. */
export interface NguImageOptions extends NguFileOptions {
  /**
   * Opens a crop dialog for each chosen image. `true` (default) keeps the image's own shape;
   * `{ aspect: 1 }` crops a square, `{ aspect: 16 / 9 }` a wide frame. `false` skips cropping.
   */
  crop?: boolean | { readonly aspect?: number };
  /** Largest output size in pixels; larger images are scaled down. */
  maxWidth?: number;
  maxHeight?: number;
  /** Output format. Default `'image/jpeg'`, or `'image/png'` for PNG input. */
  output?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Output quality from 0 to 1, for JPEG and WebP. Default 0.9. */
  quality?: number;
}

/** Options of `type: 'signature'` fields. The value is a PNG data URL, or `''` when not signed. */
export interface NguSignatureOptions {
  /** Pen color. Default: the text color. */
  penColor?: string;
  /** Height of the pad in CSS pixels. Default 160. */
  height?: number;
}

declare module 'ngu-form' {
  interface NguFieldTypeMap {
    file: readonly NguFileValue[] | NguFileValue | null;
    image: readonly NguFileValue[] | NguFileValue | null;
    signature: string;
  }
  interface NguFieldOptionsMap {
    file: NguFileOptions;
    image: NguImageOptions;
    signature: NguSignatureOptions;
  }
}
