import {
  afterNextRender,
  inject,
  Injectable,
  Injector,
  signal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { DEFAULT_BREAKPOINTS } from '../config';
import { createNguI18n, type NguI18n } from '../messages';
import type { Breakpoint, ErrorDisplay } from '../types';
import type { NguFieldContext } from './ngu-templates';

export type { ErrorDisplay } from '../types';

export type TemplateMap = ReadonlyMap<string, TemplateRef<NguFieldContext>>;

/** A rendered field, group or list that can have a problem; used by the error summary. */
export interface NguProblemSource {
  /** Id of the element the summary links to. */
  readonly id: string;
  /** The current error message, whether or not it is shown yet. */
  readonly message: Signal<string | undefined>;
  /** The host element, for page order. */
  readonly element: HTMLElement;
  /** The field, group or list node it renders; undo and redo use it to focus what they changed. */
  readonly field: Field<any>;
  /** The step, tab, panel or row it sits in, which may be out of view. */
  readonly section?: NguRevealable | null;
  /** Moves focus to the control and scrolls it into view. */
  focus(): void;
}

/** A part of the form that can be out of view, such as a tab panel or a wizard step. */
export interface NguRevealable {
  shown(): boolean;
  reveal(): void;
}

/** Shared by `ngu-form` with the fields it renders. */
@Injectable()
export class NguFormContext {
  /** When fields show errors: the form's `errorsOn` input, unless a field sets its own. */
  errorsOn: Signal<ErrorDisplay> = signal<ErrorDisplay>('dirty');
  /**
   * True from a submit attempt until a successful submit or a reset; fields then show their errors
   * at once.
   */
  submitAttempted: WritableSignal<boolean> = signal(false);
  /** Increments when the form is reset; renderers clear their own state on change. */
  resets: Signal<number> = signal(0);
  /** Increments on every submit attempt. */
  submits: Signal<number> = signal(0);
  /**
   * Increments after each submit that reached the action, whatever it returned. Captchas
   * reset here, because their tokens are single use.
   */
  completed: Signal<number> = signal(0);
  /** Work that a submit waits for, such as files still uploading. */
  readonly busy: Signal<number> = signal(0);
  /** True while the form's `load` runs; fields render placeholders. */
  loading: Signal<boolean> = signal(false);
  /** Width of `<ngu-form>` in CSS pixels, once measured. */
  width: Signal<number | undefined> = signal(undefined);
  /** Widths behind responsive `cols`: the defaults with `provideNguFormConfig({ breakpoints })` applied. */
  breakpoints: Readonly<Record<Breakpoint, number>> = DEFAULT_BREAKPOINTS;
  /** `nguField` templates by path. */
  fieldTemplates: Signal<TemplateMap> = signal(new Map());
  /** `nguControl` templates by path. */
  controlTemplates: Signal<TemplateMap> = signal(new Map());
  /** `nguPrefix` icon templates by path. */
  prefixTemplates: Signal<TemplateMap> = signal(new Map());
  /** `nguSuffix` icon templates by path. */
  suffixTemplates: Signal<TemplateMap> = signal(new Map());
  /** Messages and translations for this form. */
  i18n: NguI18n = createNguI18n();
  /**
   * Increments when a submit is refused, before focus moves. Tabs, panels, steps and rows
   * open the parts that hold problems in response, so the first problem can be focused.
   */
  refusals: Signal<number> = signal(0);
  /** Reads a short message out through the form's polite live region. */
  announce: (text: string) => void = () => undefined;

  private readonly injector = inject(Injector);

  private readonly sources = signal<readonly NguProblemSource[]>([]);
  /** Everything rendered that can show a problem, in registration order. */
  readonly problems: Signal<readonly NguProblemSource[]> = this.sources.asReadonly();

  /**
   * Makes submits wait for `work`, for example an upload. While it runs, the form counts as
   * submitting once the user presses submit. Returns `work`.
   */
  track<T>(work: Promise<T>): Promise<T> {
    const busy = this.busy as WritableSignal<number>;
    busy.update((n) => n + 1);
    const done = () => busy.update((n) => n - 1);
    work.then(done, done);
    return work;
  }

  /** Focuses a problem, first opening the step, tab, panel or row that hides it. */
  focusProblem(source: NguProblemSource): void {
    const section = source.section;
    if (section && !section.shown()) {
      section.reveal();
      afterNextRender(() => source.focus(), { injector: this.injector });
      return;
    }
    source.focus();
  }

  /** Adds a field, group or list; returns the function that removes it. */
  register(source: NguProblemSource): () => void {
    this.sources.update((list) => [...list, source]);
    return () => this.sources.update((list) => list.filter((s) => s !== source));
  }
}
