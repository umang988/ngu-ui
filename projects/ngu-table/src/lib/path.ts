/** Walks a dot path, stopping at the first missing segment instead of throwing. */
export function resolvePath(row: unknown, path: string): any {
  if (row == null || !path) return null;

  return path
    .split('.')
    .reduce<any>((value, segment) => (value == null ? value : value[segment]), row);
}
