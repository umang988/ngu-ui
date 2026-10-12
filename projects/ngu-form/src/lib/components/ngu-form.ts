import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  ErrorHandler,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Location } from '@angular/common';
import { submit, type Field } from '@angular/forms/signals';
import { DEFAULT_BREAKPOINTS, NGU_FORM_CONFIG } from '../config';
import { internalsOf } from '../internal';
import { injectNguI18n } from '../messages';
import { REVIEW_STEP, type StepsHandle } from '../steps';
import { resolvePath, toSubmissionErrors } from '../submit-errors';
import type { ErrorDisplay, FormDef, SubmitAction } from '../types';
import { NguFormContext, type NguProblemSource, type TemplateMap } from './ngu-form-context';
import { NguGroup } from './ngu-group';
import { NguControlTemplate, NguFieldTemplate } from './ngu-templates';
import { NguWizard } from './ngu-wizard';

let nextFormId = 0;

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Rendered markers of problems, in page order. */
const PROBLEMS = '.ngu-field--invalid, .ngu-group--invalid > .ngu-error, .ngu-array--invalid > .ngu-error';

/** The first marker that is on screen, not inside a closed tab, panel, row or step. */
function firstShown(problems: readonly HTMLElement[]): HTMLElement | undefined {
  return problems.find((el) => !el.closest('[hidden]')) ?? problems[0];
}

function focusProblem(el: HTMLElement | null | undefined): void {
  if (!el) {
    return;
  }
  if (el.classList.contains('ngu-field')) {
    // Prefer the checked radio, then the first control.
    const target =
      el.querySelector<HTMLElement>('input[type="radio"]:checked') ?? el.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
    return;
  }
  el.focus();
}

/**
 * Renders a `FormDef` created with `defineForm`.
 *
 * ```html
 * <ngu-form [form]="signup" [action]="register" submitLabel="Create account" (submitted)="done($event)" />
 * ```
 */
@Component({
  selector: 'ngu-form',
  imports: [NguGroup, NguWizard],
  providers: [NguFormContext],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngu-form',
    '[class.ngu-form--steps]': '!!steps()',
  },
  template: `
    @let d = form();
    <form
      novalidate
      (submit)="onSubmit($event)"
      (keydown)="onKeydown($event)"
      [attr.aria-busy]="submitting() || loading() || null"
    >
      @if (summary().length) {
        <div class="ngu-error-summary" tabindex="-1">
          <div role="alert">
            <h2 class="ngu-error-summary__title">{{ i18n.message('errorSummaryTitle', { count: summary().length }) }}</h2>
            <ul class="ngu-error-summary__list">
              @for (p of summary(); track p.id) {
                <li>
                  <a [href]="'#' + p.id" (click)="jumpTo($event, p)">{{ p.message() }}</a>
                </li>
              }
            </ul>
          </div>
        </div>
      }
      @if (d.draft.restoredAt(); as at) {
        <div class="ngu-notice" role="status">
          <span>{{ i18n.message('draftRestored', { time: when(at) }) }}</span>
          <button type="button" class="ngu-notice__action" (click)="discardDraft()">{{ i18n.message('discardDraft') }}</button>
        </div>
      }
      @if (d.loadError() !== undefined) {
        <!-- Without its data the form could overwrite a record with blanks, so it is not shown. -->
        <p class="ngu-form-error" role="alert">{{ i18n.message('loadFailed') }}</p>
      } @else if (steps()) {
        @defer (on immediate) {
          <ngu-wizard [form]="d" (navigate)="goToStep($event)" (edit)="edit($event)" />
        }
      } @else {
        <ngu-group [fields]="d.fields" [tree]="tree()" [cols]="d.cols" [layout]="d.layout === 'tabs' ? 'tabs' : 'grid'" />
      }
      <ng-content />
      @if (formError(); as message) {
        <p class="ngu-form-error" [id]="formErrorId" role="alert" tabindex="-1">{{ message }}</p>
      }
      @if (steps(); as s) {
        <div class="ngu-actions ngu-actions--steps">
          @if (!s.first()) {
            <button type="button" class="ngu-back" (click)="back()">{{ i18n.message('back') }}</button>
          }
          @if (!s.last()) {
            <button type="button" class="ngu-next" [attr.aria-disabled]="advancing() || null" (click)="next()">
              {{ s.returning() ? i18n.message('backToReview') : i18n.message('next') }}
            </button>
          } @else if (submitLabel()) {
            <button type="submit" class="ngu-submit" [attr.aria-disabled]="blocked() || null">
              {{ i18n.text(submitLabel()) }}
            </button>
          }
        </div>
      } @else if (submitLabel()) {
        <div class="ngu-actions">
          <!-- aria-disabled, not disabled: a disabled button drops keyboard focus to the page -->
          <button type="submit" class="ngu-submit" [attr.aria-disabled]="blocked() || null">
            {{ i18n.text(submitLabel()) }}
          </button>
        </div>
      }
      <div class="ngu-sr-only" aria-live="polite" aria-atomic="true">{{ announcement() }}</div>
      <div class="ngu-sr-only" role="status">{{ loading() ? i18n.message('loading') : '' }}</div>
    </form>
  `,
  styles: `
    :host {
      display: block;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-gap, 1rem);
    }
    .ngu-actions {
      display: flex;
      justify-content: var(--ngu-actions-justify, flex-start);
    }
    .ngu-actions--steps {
      gap: 0.75rem;
    }
    .ngu-actions--steps > :last-child {
      margin-inline-start: auto;
    }
    .ngu-back {
      font: inherit;
      font-weight: 500;
      padding: var(--ngu-button-padding, 0.5rem 1.25rem);
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: none;
      color: inherit;
      cursor: pointer;
    }
    .ngu-submit,
    .ngu-next {
      font: inherit;
      font-weight: 500;
      padding: var(--ngu-button-padding, 0.5rem 1.25rem);
      border: 0;
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-primary, #1a73e8);
      color: var(--ngu-on-primary, #fff);
      cursor: pointer;
    }
    .ngu-submit[aria-disabled='true'],
    .ngu-next[aria-disabled='true'] {
      opacity: 0.6;
      cursor: default;
    }
    .ngu-sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .ngu-form-error {
      margin: 0;
      padding: 0.625rem 0.75rem;
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-error-bg, #fdecea);
      color: var(--ngu-error-color, #c62828);
      font-size: 0.875rem;
    }
    .ngu-error-summary {
      padding: 0.875rem 1rem;
      border: 2px solid var(--ngu-error-color, #c62828);
      border-radius: var(--ngu-radius, 0.375rem);
    }
    .ngu-error-summary:focus-visible {
      outline: 3px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    .ngu-error-summary__title {
      margin-block: 0 0.5rem;
      margin-inline: 0;
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    .ngu-error-summary__list {
      margin: 0;
      padding-inline-start: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .ngu-error-summary__list a {
      color: var(--ngu-error-color, #c62828);
      font-weight: 500;
    }
    .ngu-notice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--ngu-radius, 0.375rem);
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      background: var(--ngu-notice-bg, rgba(127, 127, 127, 0.08));
      font-size: 0.875rem;
    }
    .ngu-notice__action {
      font: inherit;
      font-weight: 500;
      padding: 0.25rem 0.75rem;
      border: 1px solid currentColor;
      border-radius: var(--ngu-radius, 0.375rem);
      background: none;
      color: var(--ngu-primary, #1a73e8);
      cursor: pointer;
    }
    .ngu-notice__action:focus-visible,
    .ngu-submit:focus-visible,
    .ngu-next:focus-visible,
    .ngu-back:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    @media print {
      .ngu-actions,
      .ngu-notice,
      .ngu-error-summary {
        display: none;
      }
    }
    @media (forced-colors: active) {
      .ngu-submit,
      .ngu-next {
        border: 2px solid ButtonText;
      }
      .ngu-submit[aria-disabled='true'] {
        color: GrayText;
        border-color: GrayText;
      }
      .ngu-form-error,
      .ngu-notice {
        border: 1px solid CanvasText;
      }
    }
  `,
})
export class NguForm<TModel extends object, TPayload = TModel> {
  readonly form = input.required<FormDef<TModel, TPayload>>();
  /** Renders a submit button with this label when set. */
  readonly submitLabel = input<string>();
  /** When fields show their validation messages. Defaults to `dirty`. */
  readonly errorsOn = input<ErrorDisplay>('dirty');
  /**
   * Runs on a valid submit. Return nothing on success, a string for a form-level error,
   * or errors by field path, for example `{ 'account.email': 'Already registered' }`.
   */
  readonly action = input<SubmitAction<TModel, TPayload>>();
  /** Form-level message when the action throws. Defaults to the `submitFailed` message. */
  readonly failureText = input<string>();
  /** Move focus to the first problem when a submit is refused. Default `true`. */
  readonly focusOnInvalid = input(true);
  /**
   * Screen-reader announcement after a refused submit, given the number of problems.
   * Defaults to the `invalidSubmit` message.
   */
  readonly invalidAnnouncement = input<(count: number) => string>();
  /**
   * After a refused submit, list every problem at the top of the form with a link to each
   * field, and move focus there (the GOV.UK error summary pattern). Default `false`.
   */
  readonly errorSummary = input(false, { transform: booleanAttribute });

  /**
   * Ask the browser to confirm before the tab is closed or reloaded while the form has
   * unsaved changes. For in-app navigation, use `nguUnsavedChangesGuard`.
   */
  readonly warnOnUnload = input(false);

  /** Emits the payload (the model, unless `mapValue` is set) after a successful submit. */
  readonly submitted = output<TPayload>();
  /** Emits when a submit was refused: invalid fields or errors returned by the action. */
  readonly invalidSubmit = output<void>();

  private readonly context = inject(NguFormContext);
  private readonly injector = inject(Injector);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly config = inject(NGU_FORM_CONFIG, { optional: true });
  private readonly fieldTemplates = contentChildren(NguFieldTemplate);
  private readonly controlTemplates = contentChildren(NguControlTemplate);

  protected readonly i18n = injectNguI18n();
  private readonly uid = nextFormId++;
  protected readonly formErrorId = `ngu-form-error-${this.uid}`;
  /** Polite live-region text, set after a refused submit. */
  protected readonly announcement = signal('');
  /** Cleared whenever the form is reset. */
  private readonly submitAttempted = linkedSignal({
    source: () => this.form().resets(),
    computation: () => false,
  });

  protected readonly tree = computed(() => this.form().tree as unknown as Field<any>);
  /** The wizard, when the form has `layout: 'steps'`. */
  protected readonly steps = computed<StepsHandle | undefined>(() => internalsOf(this.form()).steps);
  /** True while Next waits for async checks. */
  protected readonly advancing = signal(false);
  private readonly refusals = signal(0);
  protected readonly submitting = computed(() => this.form().submitting());
  private readonly submits = signal(0);
  /** Submits that reached the action. */
  private readonly completed = signal(0);
  private readonly width = signal<number | undefined>(undefined);
  protected readonly loading = computed(() => this.form().loading());
  /** No submit while submitting, loading, disabled, read-only, or after the data failed to load. */
  protected readonly blocked = computed(() => {
    const root = this.tree()();
    return (
      this.submitting() || this.loading() || this.form().loadError() !== undefined || root.disabled() || root.readonly()
    );
  });
  /** Errors on the form itself: `$form` or a string returned by the action. */
  protected readonly formError = computed(() => {
    const message = this.submitAttempted() ? this.form().tree().errors()[0]?.message : undefined;
    return message ? this.i18n.text(message) : undefined;
  });

  /** True from a refused submit until the next submit or reset, when `errorSummary` is on. */
  private readonly summaryOpen = linkedSignal({
    source: () => this.form().resets(),
    computation: () => false,
  });
  /** Problems in page order, while the summary is open. Fixed problems drop out. */
  protected readonly summary = computed<readonly NguProblemSource[]>(() => {
    if (!this.errorSummary() || !this.summaryOpen()) {
      return [];
    }
    const list = this.context.problems().filter((p) => p.message());
    const formError = this.formError();
    const all = formError
      ? [
          ...list,
          {
            id: this.formErrorId,
            message: computed(() => formError),
            element: this.host.nativeElement.querySelector<HTMLElement>('.ngu-actions') ?? this.host.nativeElement,
            field: this.tree(),
            focus: () => this.host.nativeElement.querySelector<HTMLElement>('.ngu-form-error')?.focus(),
          },
        ]
      : list;
    return [...all].sort((a, b) =>
      a.element === b.element ? 0 : a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
  });

  constructor() {
    this.context.errorsOn = this.errorsOn;
    this.context.submitAttempted = this.submitAttempted;
    this.context.resets = computed(() => this.form().resets());
    this.context.fieldTemplates = computed<TemplateMap>(
      () => new Map(this.fieldTemplates().map((t) => [t.path(), t.template])),
    );
    this.context.controlTemplates = computed<TemplateMap>(
      () => new Map(this.controlTemplates().map((t) => [t.path(), t.template])),
    );
    this.context.submits = this.submits.asReadonly();
    this.context.completed = this.completed.asReadonly();
    this.context.loading = this.loading;
    this.context.i18n = this.i18n;
    this.context.width = this.width.asReadonly();
    this.context.breakpoints = { ...DEFAULT_BREAKPOINTS, ...this.config?.breakpoints };
    this.context.refusals = this.refusals.asReadonly();
    this.context.announce = (text) => this.announce(text);

    this.observeWidth();
    this.guardUnload();
    this.syncStepWithUrl();
  }

  // --- wizard ---------------------------------------------------------------------

  protected goToStep(key: string): void {
    if (this.steps()?.goTo(key)) {
      this.afterStepChange();
    }
  }

  protected edit(key: string): void {
    const s = this.steps();
    if (s && s.current() !== key) {
      s.edit(key);
      this.afterStepChange();
    }
  }

  protected back(): void {
    const s = this.steps();
    if (s && !s.first()) {
      s.back();
      this.afterStepChange();
    }
  }

  /** Waits for async checks, then moves on, or shows the step's problems and focuses the first. */
  protected async next(): Promise<void> {
    const s = this.steps();
    if (!s || this.advancing()) {
      return;
    }
    this.advancing.set(true);
    try {
      await this.settled(this.form());
    } finally {
      this.advancing.set(false);
    }
    if (s.next()) {
      this.afterStepChange();
      return;
    }
    afterNextRender(
      () => {
        const panel = this.host.nativeElement.querySelector<HTMLElement>(':scope > form > ngu-wizard > .ngu-step:not([hidden])');
        const problems = Array.from(panel?.querySelectorAll<HTMLElement>(PROBLEMS) ?? []);
        if (problems.length) {
          const custom = this.invalidAnnouncement();
          this.announce(custom ? custom(problems.length) : this.i18n.message('invalidSubmit', { count: problems.length }));
          if (this.focusOnInvalid()) {
            focusProblem(firstShown(problems));
          }
        }
      },
      { injector: this.injector },
    );
    this.cdr.markForCheck();
  }

  /** Focus moves to the new step's heading, which reads its position and title. */
  private afterStepChange(): void {
    afterNextRender(
      () => {
        const heading = this.host.nativeElement.querySelector<HTMLElement>(
          ':scope > form > ngu-wizard > .ngu-step:not([hidden]) > .ngu-step__title',
        );
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView?.({ block: 'nearest' });
      },
      { injector: this.injector },
    );
  }

  /**
   * With `stepParam`, the current step lives in the URL: moving between steps adds a history
   * entry, so the browser's Back button goes to the previous step, and a reload opens the
   * same step when the steps before it are still valid (for example with a draft).
   */
  private syncStepWithUrl(): void {
    const ready = signal(false);
    effect((onCleanup) => {
      const def = this.form();
      const internals = internalsOf(def);
      const param = internals.stepParam;
      const s = internals.steps;
      if (!param || !s || def.loading()) {
        return;
      }
      const location = this.injector.get(Location);
      untracked(() => {
        this.applyUrlStep(s, readParam(location.path(), param), location, param);
        ready.set(true);
      });
      const subscription = location.subscribe((event) => {
        this.applyUrlStep(s, readParam(event.url ?? location.path(), param), undefined, param);
      });
      onCleanup(() => subscription.unsubscribe());
    });
    effect(() => {
      const internals = internalsOf(this.form());
      const param = internals.stepParam;
      const s = internals.steps;
      if (!param || !s || !ready()) {
        return;
      }
      const key = s.current();
      const first = s.keys()[0];
      untracked(() => {
        const location = this.injector.get(Location);
        const path = location.path();
        const value = key === first ? null : stepValue(s, key);
        if (readParam(path, param) !== value) {
          location.go(withParam(path, param, value));
        }
      });
    });
  }

  /** Opens the step named in the URL, or the furthest step that can be reached before it. */
  private applyUrlStep(s: StepsHandle, value: string | null, location: Location | undefined, param: string): void {
    const keys = untracked(s.keys);
    const key = value === null ? keys[0] : value === 'review' && !s.all.includes('review') ? REVIEW_STEP : value;
    if (key === undefined || untracked(s.current) === key) {
      return;
    }
    if (keys.includes(key) && s.canGoTo(key)) {
      s.goTo(key);
      return;
    }
    // Not reachable yet: stop at the furthest step before it that can be opened.
    const target = keys.includes(key) ? keys.indexOf(key) : 0;
    let stop = keys[0];
    for (const k of keys.slice(0, target + 1)) {
      if (!s.canGoTo(k)) {
        break;
      }
      stop = k;
    }
    s.goTo(stop);
    if (location) {
      const first = keys[0];
      location.replaceState(withParam(location.path(), param, stop === first ? null : stepValue(s, stop)));
    }
  }

  /** Responsive columns follow the form's own width, so forms in panels and dialogs adapt too. */
  private observeWidth(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width > 0) {
        this.width.set(width);
      }
    });
    // Measure before the first paint, so a phone never sees the wide layout flash.
    afterNextRender(
      () => {
        const host = this.host.nativeElement;
        const width = Math.round(host.getBoundingClientRect().width);
        if (width > 0) {
          this.width.set(width);
        }
        observer.observe(host);
      },
      { injector: this.injector },
    );
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  /** Listens for `beforeunload` only while needed, so the page stays eligible for the back/forward cache. */
  private guardUnload(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    effect((onCleanup) => {
      const def = this.form();
      if (!this.warnOnUnload() || !def.dirty() || Object.keys(def.changes()).length === 0) {
        return;
      }
      window.addEventListener('beforeunload', listener);
      onCleanup(() => window.removeEventListener('beforeunload', listener));
    });
  }

  /** "Your changes from 10:42" today, with the date on other days. */
  protected when(date: Date): string {
    const today = new Date().toDateString() === date.toDateString();
    return new Intl.DateTimeFormat(
      this.i18n.locale(),
      today ? { timeStyle: 'short' } : { dateStyle: 'medium', timeStyle: 'short' },
    ).format(date);
  }

  protected discardDraft(): void {
    this.form().draft.discard();
    this.announce(this.i18n.message('draftDiscarded'));
    // The notice and its button are gone; keep focus inside the form.
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('.ngu-field input, .ngu-field select, .ngu-field textarea')?.focus(), {
      injector: this.injector,
    });
  }

  protected jumpTo(event: Event, problem: NguProblemSource): void {
    event.preventDefault();
    this.context.focusProblem(problem);
  }

  /** Ctrl+Z / ⌘Z undoes, Ctrl+Shift+Z / ⌘⇧Z / Ctrl+Y redoes, when the form keeps a history. */
  protected onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) {
      return;
    }
    const history = this.form().history;
    const key = event.key.toLowerCase();
    const redo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.shiftKey);
    const undo = key === 'z' && !event.shiftKey;
    if (undo && history.canUndo()) {
      event.preventDefault();
      history.undo();
      this.afterHistory('undone');
    } else if (redo && history.canRedo()) {
      event.preventDefault();
      history.redo();
      this.afterHistory('redone');
    }
  }

  /** Announces the step and moves focus to the field it changed, unless focus is already there. */
  private afterHistory(kind: 'undone' | 'redone'): void {
    this.announce(this.i18n.message(kind));
    const def = this.form();
    const path = internalsOf(def).changedByHistory()[0];
    const node = path ? resolvePath(def.tree, path) : undefined;
    if (!node) {
      return;
    }
    afterNextRender(
      () => {
        const source = this.context.problems().find((p) => p.field === node);
        if (source && !source.element.contains(document.activeElement)) {
          this.context.focusProblem(source);
        }
      },
      { injector: this.injector },
    );
  }

  /** Sets the polite live region; repeated text is still read again. */
  private announce(text: string): void {
    this.announcement.set(this.announcement() === text ? text + '\u00a0' : text);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    // Enter in a wizard's field means Next until the last step.
    const s = this.steps();
    if (s && !s.last()) {
      void this.next();
      return;
    }
    if (this.blocked()) {
      return;
    }
    this.submitAttempted.set(true);
    this.summaryOpen.set(false);
    this.submits.update((n) => n + 1);
    this.announcement.set('');
    const def = this.form();
    const internals = internalsOf(def);
    def.tree().markAsTouched();

    // A pending async check is not "invalid", so Angular would submit right away.
    // Wait for every check to settle, then require the form to be valid.
    internals.waiting.set(true);
    try {
      await this.settled(def);
    } finally {
      internals.waiting.set(false);
    }

    const ok = await submit(def.tree, {
      ignoreValidators: 'none',
      action: async () => {
        const action = this.action();
        const payload = untracked(def.payload);
        if (action) {
          try {
            const errors = toSubmissionErrors(def.tree, await action(payload));
            if (errors.length) {
              return errors;
            }
          } catch (error) {
            this.errorHandler.handleError(error);
            return [{ kind: 'server', message: this.failureText() ?? this.i18n.message('submitFailed') }];
          } finally {
            this.completed.update((n) => n + 1);
          }
        } else {
          this.completed.update((n) => n + 1);
        }
        // Saved: no unsaved changes remain, and `changes()` starts again from here.
        internals.saved();
        this.submitted.emit(payload);
        return undefined;
      },
    });
    if (ok) {
      // Saved: later edits follow errorsOn again instead of showing errors at once.
      this.submitAttempted.set(false);
    } else {
      this.invalidSubmit.emit();
      this.summaryOpen.set(this.errorSummary());
      // A wizard returns to the first step with problems; tabs, panels and rows open theirs.
      const bad = this.steps()?.firstInvalid();
      if (bad) {
        this.steps()!.goTo(bad);
      }
      this.refusals.update((n) => n + 1);
      this.afterRefusedSubmit();
    }
  }

  /**
   * Runs once the error messages are on screen: announces how many problems there are and
   * moves focus to the first one in page order. Works for overrides and custom types too,
   * because it follows the rendered invalid markers rather than the model.
   */
  private afterRefusedSubmit(): void {
    afterNextRender(
      () => {
        const host = this.host.nativeElement;
        const problems = Array.from(host.querySelectorAll<HTMLElement>(PROBLEMS));
        // The summary is focused and read in full, so it replaces the announcement.
        const summary = host.querySelector<HTMLElement>(':scope > form > .ngu-error-summary');
        if (summary) {
          summary.focus();
          return;
        }
        if (problems.length) {
          const custom = this.invalidAnnouncement();
          this.announcement.set(
            custom ? custom(problems.length) : this.i18n.message('invalidSubmit', { count: problems.length }),
          );
        }
        if (this.focusOnInvalid()) {
          const first = firstShown(problems) ?? host.querySelector<HTMLElement>('.ngu-form-error');
          focusProblem(first);
        }
      },
      { injector: this.injector },
    );
    // Make sure a render happens even when nothing else changed (repeat submit).
    this.cdr.markForCheck();
  }

  /** Resolves once no async check runs and no tracked work (such as an upload) is left. */
  private settled(def: FormDef<TModel, TPayload>): Promise<void> {
    const idle = () => !def.tree().pending() && this.context.busy() === 0;
    if (untracked(idle)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const ref = effect(
        () => {
          if (idle()) {
            ref.destroy();
            resolve();
          }
        },
        { injector: this.injector },
      );
    });
  }
}

/** The step's value in the URL: its key, or `review` for the review step. */
function stepValue(s: StepsHandle, key: string): string {
  return key === REVIEW_STEP && !s.all.includes('review') ? 'review' : key;
}

function readParam(path: string, param: string): string | null {
  return new URL(path, 'http://ngu.invalid').searchParams.get(param);
}

/** `path` with the query parameter set, or removed when `value` is null. */
function withParam(path: string, param: string, value: string | null): string {
  const url = new URL(path, 'http://ngu.invalid');
  if (value === null) {
    url.searchParams.delete(param);
  } else {
    url.searchParams.set(param, value);
  }
  return url.pathname + url.search + url.hash;
}
