/**
 * Whether a row has the path at all. `resolvePath` answers `null` both for a missing field
 * and for a field whose value is null, and keying needs those apart: the first is a
 * primitive list with nothing to read, the second is a real null key (an "Any" option).
 */
export function hasPath(row: unknown, path: string): boolean {
  if (!row || !path || typeof row !== 'object') return false;

  const segments = path.split('.');
  let current: any = row;
  for (const segment of segments.slice(0, -1)) {
    if (current == null || typeof current !== 'object') return false;
    current = current[segment];
  }
  return current != null && typeof current === 'object' && segments[segments.length - 1] in current;
}

/** Walks a dot path, stopping at the first missing segment instead of throwing. */
export function resolvePath(row: unknown, path: string): any {
  if (!row || !path) return null;

  return path
    .split('.')
    .reduce<any>((value, segment) => (value == null ? value : value[segment]), row);
}
