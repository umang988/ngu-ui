import type { NguFileValue } from './types';

/** True when a file fits an `accept` list such as `'image/*,.pdf,application/zip'`. */
export function matchesAccept(
  file: Pick<File, 'name' | 'type'>,
  accept: string | undefined,
): boolean {
  if (!accept?.trim()) {
    return true;
  }
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return accept
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) {
        return name.endsWith(rule);
      }
      if (rule.endsWith('/*')) {
        return type.startsWith(rule.slice(0, -1));
      }
      return type === rule;
    });
}

/** "2.4 MB", in the locale's digits. */
export function formatBytes(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: units[unit],
      unitDisplay: unit === 0 ? 'long' : 'short',
      maximumFractionDigits: unit === 0 ? 0 : 1,
    }).format(value);
  } catch {
    return `${Math.round(value * 10) / 10} ${['B', 'kB', 'MB', 'GB'][unit]}`;
  }
}

export function isFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

/** The value as a list, whatever its shape. */
export function asList(value: unknown): NguFileValue[] {
  if (Array.isArray(value)) {
    return value.filter((v) => v != null) as NguFileValue[];
  }
  return value == null ? [] : [value as NguFileValue];
}

export function isImage(type: string | undefined): boolean {
  return !!type && type.startsWith('image/');
}
