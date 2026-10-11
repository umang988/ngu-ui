import type { ValidationError } from '@angular/forms/signals';
import type { SubmitResult } from './types';

type ServerError = ValidationError.WithOptionalFieldTree;

/**
 * Turns a submit action's result into signal-forms submission errors. Paths that do not
 * resolve fall back to a form-level error so a message is never lost.
 */
export function toSubmissionErrors(tree: unknown, result: SubmitResult<any>): ServerError[] {
  if (result == null || result === '') {
    return [];
  }
  if (typeof result === 'string') {
    return [{ kind: 'server', message: result }];
  }
  const errors: ServerError[] = [];
  for (const [path, message] of Object.entries(result as Record<string, string | undefined>)) {
    if (!message) {
      continue;
    }
    if (path === '$form') {
      errors.push({ kind: 'server', message });
      continue;
    }
    const fieldTree = resolvePath(tree, path);
    if (fieldTree) {
      errors.push({ kind: 'server', message, fieldTree: fieldTree as ServerError['fieldTree'] });
    } else {
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        console.warn(`ngu-form: submit error path "${path}" does not match a field; shown as a form error.`);
      }
      errors.push({ kind: 'server', message });
    }
  }
  return errors;
}

export function resolvePath(tree: unknown, path: string): unknown {
  let node: any = tree;
  for (const segment of path.split('.')) {
    if (node == null) {
      return undefined;
    }
    node = node[/^\d+$/.test(segment) ? Number(segment) : segment];
  }
  return typeof node === 'function' ? node : undefined;
}

declare const ngDevMode: boolean | undefined;
