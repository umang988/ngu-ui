import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { internalsOf, withoutTitle } from '../internal';
import { injectNguI18n } from '../messages';
import { REVIEW_STEP } from '../steps';
import type { FormDef, FormDefinition } from '../types';
import { NguFormContext } from './ngu-form-context';
import { NguGroup } from './ngu-group';
import { NguSection } from './ngu-section';
import { NguView } from './ngu-view';
import { injectNguLook } from '../look';

let nextWizardId = 0;

interface StepView {
  readonly key: string;
  readonly title: string;
  readonly headingId: string;
  readonly review: boolean;
  /** The step's group or list without its title, for the step panel. */
  readonly fields: FormDefinition;
}

/**
 * The step list and step panels of a wizard, including the review step. `<ngu-form>` loads it
 * on demand for forms with `layout: 'steps'` and keeps the buttons, focus and URL handling.
 */
@Component({
  selector: 'ngu-wizard',
  imports: [NguGroup, NguSection, NguView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    class: 'ngu-wizard',
    '[class.ngu-wizard--reviewing]': 'reviewing()',
  },
  template: `
    @let s = steps();
    @let current = s.current();
    <!-- A labelled list rather than a nav landmark: a page can hold several wizards. -->
    <div class="ngu-steps">
      <ol class="ngu-steps__list" [class]="look().classes.steps" [attr.aria-label]="i18n.message('stepsLabel')">
        @for (step of views(); track step.key; let i = $index) {
          @let done = isDone(step.key);
          <li class="ngu-steps__item" [class.ngu-steps__item--current]="step.key === current" [class.ngu-steps__item--done]="done">
            <button
              type="button"
              class="ngu-steps__button"
              [class]="look().classes.step"
              [attr.aria-current]="step.key === current ? 'step' : null"
              [attr.data-done]="done ? '' : null"
              [disabled]="!s.canGoTo(step.key)"
              (click)="navigate.emit(step.key)"
            >
              <span class="ngu-steps__marker" aria-hidden="true">{{ done ? '✓' : i + 1 }}</span>
              <span class="ngu-steps__title">{{ step.title }}</span>
              @if (done) {
                <span class="ngu-sr-only">, {{ i18n.message('stepDone') }}</span>
              }
            </button>
          </li>
        }
      </ol>
    </div>
    @for (step of views(); track step.key; let i = $index) {
      @let on = step.key === current;
      <section
        class="ngu-step"
        [class.ngu-step--review]="step.review"
        [hidden]="!on"
        [attr.aria-labelledby]="step.headingId"
        nguSection
        [nguSectionOpen]="on"
        [nguSectionTried]="s.attempted().has(step.key)"
        (nguSectionReveal)="navigate.emit(step.key)"
      >
        <h2 class="ngu-step__title" [class]="look().classes.title" [id]="step.headingId" tabindex="-1">
          <span class="ngu-step__count">{{ i18n.message('stepProgress', { index: i + 1, count: s.count() }) }}</span>&ngsp;<span>{{ step.title }}</span>
        </h2>
        @if (step.review) {
          @for (part of reviewParts(); track part.key) {
            <div class="ngu-review">
              <div class="ngu-review__head">
                <h3 class="ngu-review__title" [class]="look().classes.title">{{ part.title }}</h3>
                <button type="button" class="ngu-review__edit" [class]="look().classes.button" (click)="edit.emit(part.key)">
                  {{ i18n.message('edit') }}<span class="ngu-sr-only"> {{ part.title }}</span>
                </button>
              </div>
              <ngu-view [form]="form()" [section]="part.key" />
            </div>
          }
        } @else {
          <ngu-group [fields]="step.fields" [tree]="tree()" />
        }
      </section>
    }
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-gap, var(--_ngu-gap, 1rem));
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      font: inherit;
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
      background: none;
      border: 0;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__button:disabled {
      cursor: default;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__marker {
      display: inline-grid;
      place-items: center;
      inline-size: 1.75rem;
      block-size: 1.75rem;
      border: 1px solid currentColor;
      border-radius: 50%;
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__item--done .ngu-steps__button,
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__item--current .ngu-steps__button {
      color: inherit;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__item--current .ngu-steps__marker {
      background: var(--ngu-primary, #1a73e8);
      border-color: var(--ngu-primary, #1a73e8);
      color: var(--ngu-on-primary, #fff);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__item--current .ngu-steps__title {
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-step {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-gap, var(--_ngu-gap, 1rem));
    }
    /* An author display value beats the hidden attribute, so restate it. */
    :host(:where(:not(.ngu-unstyled))) .ngu-step[hidden] {
      display: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-step__title {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      margin: 0;
      font-size: calc(var(--ngu-title-size, 1rem) * 1.25);
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-step__title:focus {
      outline: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-step__count {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-review {
      padding-block-end: var(--ngu-gap, var(--_ngu-gap, 1rem));
      border-block-end: 1px solid var(--ngu-border-color, #c7c7c7);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-review__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-block-end: 0.75rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-review__title {
      margin: 0;
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-review__edit {
      font: inherit;
      font-weight: 500;
      padding: 0.25rem 0.75rem;
      border: 1px solid currentColor;
      border-radius: var(--ngu-radius, 0.375rem);
      background: none;
      color: var(--ngu-primary, #1a73e8);
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-steps__button:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-step__title:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-review__edit:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    .ngu-sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }
    @media (forced-colors: active) {
      :host(:where(:not(.ngu-unstyled))) .ngu-steps__item--current .ngu-steps__marker {
        border-color: Highlight;
      }
    }
    /* Print every step, or only the review once the user reached it. */
    @media print {
      :host(:where(:not(.ngu-unstyled))) .ngu-steps,
      :host(:where(:not(.ngu-unstyled))) .ngu-step__count,
      :host(:where(:not(.ngu-unstyled))) .ngu-review__edit {
        display: none;
      }
      :host(:not(.ngu-wizard--reviewing):not(.ngu-unstyled)) .ngu-step[hidden]:not(.ngu-step--review) {
        display: flex !important;
      }
      :host(:not(.ngu-wizard--reviewing):not(.ngu-unstyled)) .ngu-step--review {
        display: none !important;
      }
    }
  `,
})
export class NguWizard {
  protected readonly look = injectNguLook();
  readonly form = input.required<FormDef<any, any>>();
  /** A step in the step list was chosen, or a summary link asked for a hidden step. */
  readonly navigate = output<string>();
  /** An Edit button on the review step. */
  readonly edit = output<string>();

  protected readonly i18n = inject(NguFormContext, { optional: true })?.i18n ?? injectNguI18n();
  private readonly id = `ngu-wizard-${nextWizardId++}`;
  protected readonly steps = computed(() => internalsOf(this.form()).steps!);
  protected readonly tree = computed(() => this.form().tree as unknown as Field<any>);
  protected readonly reviewing = computed(() => this.steps().current() === REVIEW_STEP);

  /** The steps on screen, in order, ending with the review step when it is on. */
  protected readonly views = computed<readonly StepView[]>(() => {
    const def = this.form();
    const review = internalsOf(def).review;
    return this.steps()
      .keys()
      .map((key) =>
        key === REVIEW_STEP
          ? {
              key,
              title: review === true || review === undefined ? this.i18n.message('review') : this.i18n.text(review),
              headingId: `${this.id}-review`,
              review: true,
              fields: {},
            }
          : {
              key,
              title: this.title(key),
              headingId: `${this.id}-${key}`,
              review: false,
              fields: { [key]: withoutTitle(def.fields[key]) },
            },
      );
  });
  /** The steps the review step summarises. */
  protected readonly reviewParts = computed(() => this.views().filter((step) => !step.review));

  private title(key: string): string {
    const def = this.form().fields[key];
    const title = def && 'title' in def ? def.title : undefined;
    return this.i18n.text(title) ?? key;
  }

  /** A step before the current one whose fields are valid. */
  protected isDone(key: string): boolean {
    const s = this.steps();
    return (
      key !== REVIEW_STEP &&
      s.keys().indexOf(key) < s.index() &&
      (this.tree() as unknown as Record<string, Field<any>>)[key]().valid()
    );
  }
}
