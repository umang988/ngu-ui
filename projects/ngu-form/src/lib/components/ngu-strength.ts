import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { injectNguI18n } from '../messages';
import { defaultRuleTests, passwordScore } from '../strength';
import type { StrengthOptions } from '../types';
import { NguFormContext } from './ngu-form-context';
import { injectNguLook } from '../look';

/**
 * Password strength meter, text value and checklist for a password field. The bar is
 * decorative; the text (linked to the input by `textId`) carries the value and is
 * announced politely when the level changes.
 */
@Component({
  selector: 'ngu-strength',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    class: 'ngu-strength',
    '[attr.data-score]': 'value() ? score() : null',
  },
  template: `
    <span class="ngu-strength__meter" aria-hidden="true"><span class="ngu-strength__bar"></span></span>
    <p class="ngu-strength__text" [id]="textId()" aria-live="polite">{{ value() ? text() : '' }}</p>
    <ul class="ngu-strength__rules">
      @for (r of rules(); track $index) {
        <li [class.ngu-rule--met]="r.met">
          <span class="ngu-rule__mark" aria-hidden="true">{{ r.met ? '✓' : '○' }}</span>
          {{ r.label }}<span class="ngu-sr-only">, {{ r.met ? i18n.message('ruleMet') : i18n.message('ruleUnmet') }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-size: 0.8125rem;
      --ngu-strength-fill: 0%;
      --ngu-strength-color: var(--ngu-error-color, #c62828);
    }
    :host([data-score='0']:not(.ngu-unstyled)) {
      --ngu-strength-fill: 10%;
    }
    :host([data-score='1']:not(.ngu-unstyled)) {
      --ngu-strength-fill: 25%;
    }
    :host([data-score='2']:not(.ngu-unstyled)) {
      --ngu-strength-fill: 50%;
      --ngu-strength-color: var(--ngu-warning-color, #8a5300);
    }
    :host([data-score='3']:not(.ngu-unstyled)) {
      --ngu-strength-fill: 75%;
      --ngu-strength-color: var(--ngu-success-color, #1e7a3c);
    }
    :host([data-score='4']:not(.ngu-unstyled)) {
      --ngu-strength-fill: 100%;
      --ngu-strength-color: var(--ngu-success-color, #1e7a3c);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-strength__meter {
      display: block;
      block-size: 0.375rem;
      border-radius: 999px;
      background: var(--ngu-skeleton-color, rgba(127, 127, 127, 0.16));
      overflow: hidden;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-strength__bar {
      display: block;
      block-size: 100%;
      inline-size: var(--ngu-strength-fill);
      background: var(--ngu-strength-color);
      transition: inline-size 0.2s ease-out;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-strength__text {
      margin: 0;
      min-block-size: 1lh;
      font-weight: 500;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-strength__rules {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: 0.125rem 1rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-rule--met {
      color: var(--ngu-success-color, #1e7a3c);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-rule__mark {
      display: inline-block;
      inline-size: 1em;
    }
    .ngu-sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      :host(:where(:not(.ngu-unstyled))) .ngu-strength__bar {
        transition: none;
      }
    }
    @media (forced-colors: active) {
      :host(:where(:not(.ngu-unstyled))) .ngu-strength__meter {
        border: 1px solid CanvasText;
      }
      :host(:where(:not(.ngu-unstyled))) .ngu-strength__bar {
        background: Highlight;
        forced-color-adjust: none;
      }
    }
  `,
})
export class NguStrength {
  protected readonly look = injectNguLook();
  /** The password typed so far. */
  readonly value = input.required<string>();
  /** The field's `strength` options, with `true` passed as `{}`: checklist rules and score. */
  readonly options = input.required<StrengthOptions>();
  /** Length rule for the default checklist: the field's `minLength`, or 8. */
  readonly minLength = input.required<number>();
  /** Id of the text value, for the input's `aria-describedby`. */
  readonly textId = input.required<string>();

  protected readonly i18n = inject(NguFormContext, { optional: true })?.i18n ?? injectNguI18n();

  protected readonly score = computed(() => passwordScore(this.value(), this.options(), this.minLength()));
  protected readonly text = computed(() =>
    this.i18n.message('strength', { level: this.i18n.message('strengthLevels', { score: this.score() }) }),
  );
  protected readonly rules = computed(() => {
    const value = this.value();
    const custom = this.options().rules;
    if (custom) {
      return custom.map((r) => ({ label: this.i18n.text(r.label), met: value !== '' && r.test(value) }));
    }
    const min = this.minLength();
    return defaultRuleTests(min).map((r) => ({
      label:
        r.id === 'length'
          ? this.i18n.message('ruleLength', { min })
          : this.i18n.message(r.id === 'case' ? 'ruleCase' : r.id === 'number' ? 'ruleNumber' : 'ruleSymbol'),
      met: value !== '' && r.test(value),
    }));
  });
}
