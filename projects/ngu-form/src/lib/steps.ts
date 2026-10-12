import { computed, signal, untracked, type Signal } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { ordered } from './internal';
import type { FormDefinition, FormSteps } from './types';

/** Key of the review step that `review: true` adds after the last step. */
export const REVIEW_STEP = '$review';

/** What `<ngu-form>` needs from a wizard beyond the public `FormSteps`. */
export interface StepsHandle extends FormSteps {
  /** Every step in order, skipped ones included. */
  readonly all: readonly string[];
  /** Steps whose errors show because Next was pressed on them. */
  readonly attempted: Signal<ReadonlySet<string>>;
  /** True after an Edit link on the review step: Next then returns to the review. */
  readonly returning: Signal<boolean>;
  /** Goes to a step from the review step, so Next comes back. */
  edit(key: string): void;
  /** The first step, in order, that has errors. */
  firstInvalid(): string | undefined;
  /** Back to the first step with nothing attempted, after a reset. */
  restart(): void;
}

export function setupSteps(fields: FormDefinition, root: Field<any>, review: boolean): StepsHandle {
  const all = ordered(fields)
    .filter(([, def]) => def.__ngu !== 'static')
    .map(([key]) => key);
  const node = (key: string) => (root as unknown as Record<string, Field<any>>)[key];

  const keys = computed(
    () => {
      const shown = all.filter((key) => !node(key)().hidden());
      return review ? [...shown, REVIEW_STEP] : shown;
    },
    { equal: (a, b) => a.length === b.length && a.every((k, i) => k === b[i]) },
  );
  const stored = signal(all[0] ?? '');
  /** A step that became skipped hands over to the next step that is shown. */
  const current = computed(() => {
    const list = keys();
    const key = stored();
    if (list.includes(key)) {
      return key;
    }
    const at = all.indexOf(key);
    return list.find((k) => k === REVIEW_STEP || all.indexOf(k) > at) ?? list[list.length - 1] ?? key;
  });
  const index = computed(() => keys().indexOf(current()));
  const attempted = signal<ReadonlySet<string>>(new Set());
  const returning = signal(false);

  const valid = (key: string) => key === REVIEW_STEP || node(key)().valid();
  const canGoTo = (key: string): boolean => {
    const list = keys();
    const target = list.indexOf(key);
    if (target < 0) {
      return false;
    }
    return target <= index() || list.slice(0, target).every(valid);
  };
  const goTo = (key: string): boolean =>
    untracked(() => {
      if (!canGoTo(key)) {
        return false;
      }
      if (key === REVIEW_STEP) {
        returning.set(false);
      }
      if (key === current()) {
        return false;
      }
      stored.set(key);
      return true;
    });

  return {
    all,
    keys,
    current,
    index,
    count: computed(() => keys().length),
    first: computed(() => index() === 0),
    last: computed(() => index() === keys().length - 1),
    attempted: attempted.asReadonly(),
    returning: returning.asReadonly(),
    canGoTo,
    goTo,
    next() {
      return untracked(() => {
        const key = current();
        attempted.update((set) => new Set(set).add(key));
        if (key === REVIEW_STEP || !node(key)().valid()) {
          return false;
        }
        const list = keys();
        if (returning() && canGoTo(REVIEW_STEP)) {
          return goTo(REVIEW_STEP);
        }
        const following = list[list.indexOf(key) + 1];
        return following !== undefined && goTo(following);
      });
    },
    back() {
      untracked(() => {
        const list = keys();
        const previous = list[list.indexOf(current()) - 1];
        if (previous !== undefined) {
          goTo(previous);
        }
      });
    },
    edit(key: string) {
      if (goTo(key)) {
        returning.set(true);
      }
    },
    firstInvalid() {
      return untracked(() => keys().find((key) => key !== REVIEW_STEP && node(key)().invalid()));
    },
    restart() {
      stored.set(all[0] ?? '');
      attempted.set(new Set());
      returning.set(false);
    },
  };
}

/** Steps of a form without `layout: 'steps'`. */
export function inertSteps(): StepsHandle {
  const none = signal<readonly string[]>([]).asReadonly();
  const no = signal(false).asReadonly();
  return {
    all: [],
    keys: none,
    current: signal('').asReadonly(),
    index: signal(-1).asReadonly(),
    count: signal(0).asReadonly(),
    first: no,
    last: no,
    attempted: signal<ReadonlySet<string>>(new Set()).asReadonly(),
    returning: no,
    canGoTo: () => false,
    goTo: () => false,
    next: () => false,
    back: () => undefined,
    edit: () => undefined,
    firstInvalid: () => undefined,
    restart: () => undefined,
  };
}
