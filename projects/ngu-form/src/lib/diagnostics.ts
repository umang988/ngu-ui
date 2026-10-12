import { isLeafDef, type FormDefinition } from './types';

declare const ngDevMode: unknown;

/** Where each code is explained. */
export const DIAGNOSTICS_URL = 'https://ngu-form.netlify.app/diagnostics';

/**
 * Every problem ngu-form reports has a code. `NGU-1xx` are mistakes in a spec, thrown by
 * `defineForm`; `NGU-2xx` are paths that match no field; `NGU-3xx` are missing providers;
 * `NGU-4xx` are conflicts between forms. Warnings only appear in development builds.
 */
export type NguDiagnosticCode =
  | 'NGU-101'
  | 'NGU-102'
  | 'NGU-103'
  | 'NGU-104'
  | 'NGU-105'
  | 'NGU-106'
  | 'NGU-107'
  | 'NGU-108'
  | 'NGU-109'
  | 'NGU-110'
  | 'NGU-111'
  | 'NGU-201'
  | 'NGU-202'
  | 'NGU-301'
  | 'NGU-302'
  | 'NGU-303'
  | 'NGU-304'
  | 'NGU-401';

/** True in development builds (Angular's `ngDevMode`). */
export function isDevMode(): boolean {
  return typeof ngDevMode === 'undefined' || !!ngDevMode;
}

export function diagnostic(code: NguDiagnosticCode, message: string): string {
  return `ngu-form [${code}]: ${message} See ${DIAGNOSTICS_URL}#${code.toLowerCase()}`;
}

/** An `Error` with the code and a link to its explanation. */
export function nguError(code: NguDiagnosticCode, message: string): Error {
  return new Error(diagnostic(code, message));
}

const warned = new Set<string>();

/** Logs a development warning once per code and subject. */
export function nguWarn(code: NguDiagnosticCode, message: string, subject: string = message): void {
  const key = `${code}|${subject}`;
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  console.warn(diagnostic(code, message));
}

/** Forgets which warnings were shown; for tests. */
export function resetWarnings(): void {
  warned.clear();
}

/** The candidate closest to `wanted` by edit distance, when it is close enough to be a typo. */
export function closest(wanted: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestDistance = Math.max(2, Math.floor(wanted.length / 3)) + 1;
  for (const candidate of candidates) {
    const d = distance(wanted, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * Paths a template override can target: every field, with `[]` for list rows. Run-time
 * fields arrive later, so any path under a run-time group is accepted (`open`).
 */
export function fieldPaths(fields: FormDefinition, base = ''): { readonly exact: Set<string>; readonly open: Set<string> } {
  const exact = new Set<string>();
  const open = new Set<string>();
  const walk = (defs: FormDefinition, prefix: string) => {
    for (const [key, def] of Object.entries(defs)) {
      const path = prefix ? `${prefix}.${key}` : key;
      switch (def.__ngu) {
        case 'leaf':
          exact.add(path);
          break;
        case 'group':
          walk(def.fields, path);
          break;
        case 'array':
          if (isLeafDef(def.item)) {
            exact.add(`${path}[]`);
          } else {
            walk(def.item, `${path}[]`);
          }
          break;
        case 'dynamic':
          open.add(`${path}.`);
          break;
      }
    }
  };
  walk(fields, base);
  return { exact, open };
}

/** True when `path` names a field, or may name a run-time field. */
export function matchesField(paths: ReturnType<typeof fieldPaths>, path: string): boolean {
  if (paths.exact.has(path)) {
    return true;
  }
  for (const prefix of paths.open) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}
