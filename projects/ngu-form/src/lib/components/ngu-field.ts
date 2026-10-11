import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  isSignal,
  reflectComponentType,
  linkedSignal,
  signal,
  untracked,
  viewChild,
  type Type,
} from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';
import { NguCaptcha } from '../controls/captcha';
import { NguChoices } from '../controls/choices';
import { NguColor } from '../controls/color';
import { NguConsent } from '../controls/consent';
import { NguDateRange } from '../controls/date-range';
import { NguOtp } from '../controls/otp';
import { NguPhone } from '../controls/phone';
import { NguRange } from '../controls/range';
import { NguRating } from '../controls/rating';
import { NguSelect } from '../controls/select';
import { NguTags } from '../controls/tags';
import { NGU_FIELD_TYPES } from '../field-types';
import { deepMerge, NGU_CHOICES, NGU_NODES, NGU_WARNINGS } from '../internal';
import { injectNguI18n } from '../messages';
import { DEFAULT_PASSWORD_LENGTH, strengthOptions } from '../strength';
import { withScheme } from '../rules';
import {
  currencyOptions,
  formatLocalNumber,
  maskTransform,
  NguTransform,
  numberOptions,
  parseLocalNumber,
  type FieldTransform,
} from '../transform';
import type { ChangeContext, Choice, InputMode, LeafDef } from '../types';
import { NguFormContext } from './ngu-form-context';
import { NguStrength } from './ngu-strength';
import type { NguFieldContext } from './ngu-templates';

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

let nextId = 0;

/** Types rendered as `<input type="...">` with the same name. */
const NATIVE_TYPES = new Set([
  'text',
  'email',
  'password',
  'number',
  'date',
  'url',
  'search',
  'tel',
  'time',
  'datetime-local',
  'month',
  'week',
]);

/** True on devices with a mouse or trackpad; read once. */
const FINE_POINTER = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;

/** How long after a click or keystroke a value change still counts as the user's own. */
const GESTURE_WINDOW_MS = 400;
const UNSET = Symbol();

function isAutofilled(el: Element): boolean {
  try {
    return el.matches(':autofill');
  } catch {
    try {
      return el.matches(':-webkit-autofill');
    } catch {
      return false;
    }
  }
}

/**
 * Renders one input from a `LeafDef`, bound through `[formField]`.
 *
 * Rendering order: an `nguField` template for this path replaces everything;
 * otherwise the label and messages are rendered around either an `nguControl`
 * template, a custom type renderer, or the built-in control.
 */
@Component({
  selector: 'ngu-field',
  imports: [
    FormField,
    NgTemplateOutlet,
    NgComponentOutlet,
    NguTransform,
    NguStrength,
    NguSelect,
    NguChoices,
    NguConsent,
    NguRating,
    NguDateRange,
    NguTags,
    NguPhone,
    NguCaptcha,
    NguRange,
    NguColor,
    NguOtp,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngu-field',
    '[class.ngu-field--invalid]': 'showErrors()',
    '[class.ngu-field--warning]': '!!warning()',
    '[class.ngu-field--loading]': 'loading()',
    '[class.ngu-field--disabled]': 'state().disabled()',
    '[class.ngu-field--pending]': 'state().pending()',
    '[class.ngu-field--computed]': '!!def().compute',
    '(focusout)': 'onFocusOut($event)',
    '(input)': 'onGesture()',
    '(change)': 'onGesture()',
    '(click)': 'onGesture()',
  },
  template: `
    @let d = def();
    @if (loading()) {
      @if (layout() === 'check') {
        <span class="ngu-check"><span class="ngu-skeleton ngu-skeleton--box" aria-hidden="true"></span>{{ label() }}</span>
      } @else {
        @if (label()) {
          <span class="ngu-label">{{ label() }}@if (state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</span>
        }
        <span class="ngu-skeleton" [class.ngu-skeleton--area]="d.type === 'textarea'" aria-hidden="true"></span>
      }
    } @else if (fieldTemplate(); as tpl) {
      <ng-container *ngTemplateOutlet="tpl; context: templateContext()" />
    } @else {
      @switch (slot()) {
        @case ('template') {
          <ng-container *ngTemplateOutlet="labelTpl" />
          <ng-container *ngTemplateOutlet="controlTemplate()!; context: templateContext()" />
        }
        @case ('custom') {
          <ng-container *ngTemplateOutlet="labelTpl" />
          <ng-container *ngComponentOutlet="customRenderer()!; inputs: rendererInputs()" />
        }
        @default {
          @switch (layout()) {
            @case ('check') {
              <span class="ngu-check-row">
                <label class="ngu-check" [class.ngu-switch]="d.type === 'switch'" [for]="id">
                  @switch (d.type) {
                    @case ('consent') {
                      <input type="checkbox" nguConsent [id]="id" [formField]="field()" [attr.aria-invalid]="invalidAttr()" [attr.aria-describedby]="describedBy()" />
                    }
                    @case ('switch') {
                      <input type="checkbox" role="switch" [id]="id" [formField]="field()" [attr.aria-invalid]="invalidAttr()" [attr.aria-describedby]="describedBy()" />
                    }
                    @default {
                      <input type="checkbox" [id]="id" [formField]="field()" [attr.aria-invalid]="invalidAttr()" [attr.aria-describedby]="describedBy()" />
                    }
                  }
                  <span>{{ label() }}@if (d.type !== 'checkbox' && state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</span>
                </label>
                @if (d.policy; as policy) {
                  <a class="ngu-policy" [href]="policy.href" target="_blank" rel="noopener">{{ i18n.text(policy.label) }}<span class="ngu-sr-only"> ({{ i18n.message('opensInNewTab') }})</span></a>
                }
              </span>
            }
            @case ('fieldset') {
              <fieldset
                class="ngu-fieldset"
                [attr.role]="radioLike() ? 'radiogroup' : null"
                [attr.aria-labelledby]="label() ? id + '-legend' : null"
                [attr.aria-invalid]="radioLike() ? invalidAttr() : null"
                [attr.aria-required]="(radioLike() && state().required()) || null"
                [attr.aria-describedby]="d.type === 'daterange' ? null : describedBy()"
              >
                @if (label()) {
                  <legend class="ngu-label" [id]="id + '-legend'">{{ label() }}@if (state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</legend>
                }
                @switch (d.type) {
                  @case ('rating') {
                    @defer (on immediate) {
                      <ngu-rating [formField]="field()" [count]="ratingCount()" [i18n]="i18n" />
                    } @placeholder {
                      <span class="ngu-skeleton" aria-hidden="true"></span>
                    }
                  }
                  @case ('daterange') {
                    @defer (on immediate) {
                      <ngu-date-range [formField]="field()" [def]="d" [id]="id" [errorShown]="showErrors()" [describedBy]="describedBy() ?? undefined" [i18n]="i18n" />
                    } @placeholder {
                      <span class="ngu-skeleton" aria-hidden="true"></span>
                    }
                  }
                  @default {
                    <ngu-choices
                      [formField]="field()"
                      [choices]="choices()"
                      [kind]="d.multiple ? 'checkbox' : 'radio'"
                      [appearance]="d.type === 'segmented' ? 'buttons' : 'list'"
                      [errorShown]="showErrors()"
                    />
                  }
                }
              </fieldset>
            }
            @case ('plain') {
              <div
                class="ngu-captcha-group"
                role="group"
                [attr.aria-labelledby]="label() ? id + '-label' : null"
                [attr.aria-label]="label() ? null : i18n.message('captchaLabel')"
                [attr.aria-describedby]="describedBy()"
              >
                @if (label()) {
                  <span class="ngu-label" [id]="id + '-label'">{{ label() }}</span>
                }
                @defer (on immediate) {
                  <ngu-captcha [id]="id" [formField]="field()" [field]="field()" [adapter]="d.captcha" [i18n]="i18n" />
                } @placeholder {
                  <span class="ngu-skeleton" aria-hidden="true"></span>
                }
              </div>
            }
            @default {
              <ng-container *ngTemplateOutlet="labelTpl" />
              @switch (d.type) {
                @case ('tags') {
                  @defer (on immediate) {
                    <ngu-tags
                      [formField]="field()"
                      [id]="id"
                      [placeholder]="placeholder()"
                      [tagLength]="d.maxLength"
                      [separators]="d.separators ?? [',']"
                      [errorShown]="showErrors()"
                      [describedBy]="describedBy() ?? undefined"
                      [i18n]="i18n"
                    />
                  } @placeholder {
                    <span class="ngu-skeleton" aria-hidden="true"></span>
                  }
                }
                @case ('phone') {
                  @defer (on immediate) {
                    <ngu-phone
                      [formField]="field()"
                      [id]="id"
                      [placeholder]="placeholder()"
                      [autocomplete]="d.autocomplete"
                      [countries]="d.countries"
                      [defaultCountry]="d.country"
                      [errorShown]="showErrors()"
                      [describedBy]="describedBy() ?? undefined"
                      [i18n]="i18n"
                    />
                  } @placeholder {
                    <span class="ngu-skeleton" aria-hidden="true"></span>
                  }
                }
                @case ('range') {
                  @defer (on immediate) {
                    <ngu-range [field]="field()" [id]="id" [step]="d.step" [text]="rangeText()" [errorShown]="showErrors()" [describedBy]="describedBy() ?? undefined" />
                  } @placeholder {
                    <span class="ngu-skeleton" aria-hidden="true"></span>
                  }
                }
                @case ('color') {
                  @defer (on immediate) {
                    <ngu-color [field]="field()" [id]="id" [errorShown]="showErrors()" [describedBy]="describedBy() ?? undefined" />
                  } @placeholder {
                    <span class="ngu-skeleton" aria-hidden="true"></span>
                  }
                }
                @case ('otp') {
                  @defer (on immediate) {
                    <ngu-otp
                      [field]="field()"
                      [id]="id"
                      [length]="d.length ?? 6"
                      [alphanumeric]="d.characters === 'alphanumeric'"
                      [enterkeyhint]="d.enterkeyhint"
                      [errorShown]="showErrors()"
                      [describedBy]="describedBy() ?? undefined"
                    />
                  } @placeholder {
                    <span class="ngu-skeleton" aria-hidden="true"></span>
                  }
                }
                @default {
                  <div class="ngu-control" [class.ngu-control--adorned]="adorned()">
                    @if (prefix()) {
                      <span class="ngu-affix ngu-prefix" [id]="id + '-prefix'">{{ prefix() }}</span>
                    }
                    @switch (d.type) {
                      @case ('textarea') {
                        @if (transform(); as t) {
                          <textarea
                            #textarea
                            [nguTransform]="t"
                            [id]="id"
                            [class.ngu-autosize]="!!d.maxRows"
                            [class.ngu-rows]="!!d.rows"
                            [attr.rows]="d.rows ?? null"
                            [placeholder]="placeholder()"
                            [attr.autocomplete]="d.autocomplete ?? null"
                            [attr.inputmode]="inputMode()"
                            [attr.enterkeyhint]="d.enterkeyhint ?? null"
                            [formField]="field()"
                            [attr.aria-invalid]="invalidAttr()"
                            [attr.aria-describedby]="describedBy()"
                          ></textarea>
                        } @else {
                          <textarea
                            #textarea
                            [id]="id"
                            [class.ngu-autosize]="!!d.maxRows"
                            [class.ngu-rows]="!!d.rows"
                            [attr.rows]="d.rows ?? null"
                            [placeholder]="placeholder()"
                            [attr.autocomplete]="d.autocomplete ?? null"
                            [attr.inputmode]="inputMode()"
                            [attr.enterkeyhint]="d.enterkeyhint ?? null"
                            [formField]="field()"
                            [attr.aria-invalid]="invalidAttr()"
                            [attr.aria-describedby]="describedBy()"
                          ></textarea>
                        }
                      }
                      @case ('select') {
                        <select
                          [nguSelect]="choices()"
                          [id]="id"
                          [multiple]="!!d.multiple"
                          [attr.size]="selectSize()"
                          [attr.autocomplete]="d.autocomplete ?? null"
                          [formField]="field()"
                          [attr.aria-invalid]="invalidAttr()"
                          [attr.aria-describedby]="describedBy()"
                        >
                          @if (placeholder() && !d.multiple) {
                            <option value="" disabled>{{ placeholder() }}</option>
                          }
                          @for (c of choices(); track $index) {
                            <option [value]="'' + $index" [disabled]="c.disabled ?? false">{{ c.label }}</option>
                          }
                        </select>
                      }
                      @default {
                        @if (transform(); as t) {
                          <input
                            [nguTransform]="t"
                            [id]="id"
                            [type]="inputType()"
                            [placeholder]="placeholder()"
                            [attr.autocomplete]="d.autocomplete ?? null"
                            [attr.inputmode]="inputMode()"
                            [attr.enterkeyhint]="enterKeyHint()"
                            [attr.dir]="d.mask ? 'ltr' : null"
                            [formField]="field()"
                            [attr.aria-invalid]="invalidAttr()"
                            [attr.aria-describedby]="describedBy()"
                          />
                        } @else {
                          <input
                            [id]="id"
                            [type]="inputType()"
                            [placeholder]="placeholder()"
                            [attr.step]="d.step ?? null"
                            [attr.min]="textBounds().min"
                            [attr.max]="textBounds().max"
                            [attr.autocomplete]="d.autocomplete ?? null"
                            [attr.inputmode]="inputMode()"
                            [attr.enterkeyhint]="enterKeyHint()"
                            [attr.dir]="d.type === 'url' || d.type === 'tel' ? 'ltr' : null"
                            [formField]="field()"
                            [attr.aria-invalid]="invalidAttr()"
                            [attr.aria-describedby]="describedBy()"
                          />
                        }
                      }
                    }
                    @if (suffix()) {
                      <span class="ngu-affix ngu-suffix" [id]="id + '-suffix'">{{ suffix() }}</span>
                    }
                    @if (revealable()) {
                      <button
                        type="button"
                        class="ngu-reveal"
                        [attr.aria-controls]="id"
                        [attr.aria-label]="revealed() ? i18n.message('hidePasswordLabel') : i18n.message('showPasswordLabel')"
                        [disabled]="state().disabled()"
                        (click)="toggleReveal()"
                      >
                        {{ revealed() ? i18n.message('hidePassword') : i18n.message('showPassword') }}
                      </button>
                      <span class="ngu-sr-only" aria-live="polite">{{ revealStatus() }}</span>
                    }
                  </div>
                  @if (multiHint()) {
                    <p class="ngu-hint" [id]="id + '-multi'">{{ i18n.message('multiSelectHint') }}</p>
                  }
                  @if (counter(); as c) {
                    <p class="ngu-counter" [class.ngu-counter--over]="c.left < 0" aria-hidden="true">{{ c.length }} / {{ c.max }}</p>
                    <span class="ngu-sr-only" [id]="id + '-count'">{{ c.text }}</span>
                  }
                  @if (strength(); as s) {
                    <ngu-strength [value]="s.value" [options]="s.options" [minLength]="s.minLength" [textId]="id + '-strength'" />
                  }
                }
              }
            }
          }
        }
      }
      @if (showErrors()) {
        <p class="ngu-error" [id]="id + '-msg'">{{ message() }}</p>
      } @else if (state().pending()) {
        <p class="ngu-pending" [id]="id + '-msg'" aria-live="polite">{{ pendingText() }}</p>
      } @else if (warning(); as w) {
        <p class="ngu-warning" [id]="id + '-msg'"><span class="ngu-warning__mark" aria-hidden="true">!</span><span class="ngu-sr-only">{{ i18n.message('warningPrefix') }} </span>{{ w }}</p>
      } @else if (hint()) {
        <p class="ngu-hint" [id]="id + '-msg'">{{ hint() }}</p>
      }
    }

    <ng-template #labelTpl>
      @if (label()) {
        <label class="ngu-label" [id]="id + '-label'" [for]="id">{{ label() }}@if (state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</label>
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-field-gap, 0.375rem);
      min-inline-size: 0;
    }
    .ngu-label {
      font-size: var(--ngu-label-size, 0.875rem);
      font-weight: 500;
      color: var(--ngu-label-color, inherit);
    }
    .ngu-required {
      color: var(--ngu-error-color, #c62828);
      margin-inline-start: 0.125rem;
    }
    input:not([type='checkbox']):not([type='radio']),
    select,
    textarea {
      font: inherit;
      padding: var(--ngu-input-padding, 0.5rem 0.75rem);
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      color: inherit;
      inline-size: 100%;
      box-sizing: border-box;
    }
    input[readonly],
    textarea[readonly] {
      background: var(--ngu-readonly-bg, rgba(127, 127, 127, 0.08));
    }
    textarea {
      min-block-size: 5rem;
      resize: vertical;
      line-height: var(--ngu-textarea-line-height, 1.5);
    }
    textarea.ngu-rows {
      min-block-size: 0;
    }
    textarea.ngu-autosize {
      resize: none;
    }
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    :host(.ngu-field--invalid) input,
    :host(.ngu-field--invalid) select,
    :host(.ngu-field--invalid) textarea,
    :host(.ngu-field--invalid) .ngu-control--adorned {
      border-color: var(--ngu-error-color, #c62828);
    }
    :host(.ngu-field--disabled) {
      opacity: 0.6;
    }
    .ngu-control {
      display: flex;
      align-items: stretch;
      min-inline-size: 0;
    }
    .ngu-control > input,
    .ngu-control > select,
    .ngu-control > textarea {
      flex: 1 1 auto;
      min-inline-size: 0;
    }
    .ngu-control--adorned {
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
    }
    .ngu-control--adorned > input,
    .ngu-control--adorned > select,
    .ngu-control--adorned > textarea {
      border: 0;
      background: transparent;
    }
    .ngu-control--adorned:has(> input:focus-visible, > select:focus-visible, > textarea:focus-visible) {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    .ngu-control--adorned > input:focus-visible,
    .ngu-control--adorned > select:focus-visible,
    .ngu-control--adorned > textarea:focus-visible {
      outline: none;
    }
    .ngu-affix {
      display: flex;
      align-items: center;
      padding-inline: 0.75rem;
      color: var(--ngu-hint-color, #6b6b6b);
      white-space: nowrap;
    }
    .ngu-prefix {
      padding-inline-end: 0;
    }
    .ngu-suffix {
      padding-inline-start: 0;
    }
    .ngu-control--adorned > .ngu-prefix + input,
    .ngu-control--adorned > .ngu-prefix + select {
      padding-inline-start: 0.375rem;
    }
    .ngu-control--adorned > input:has(+ .ngu-suffix),
    .ngu-control--adorned > select:has(+ .ngu-suffix) {
      padding-inline-end: 0.375rem;
    }
    .ngu-reveal {
      font: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      padding-inline: 0.75rem;
      border: 0;
      border-radius: var(--ngu-radius, 0.375rem);
      background: none;
      color: var(--ngu-primary, #1a73e8);
      cursor: pointer;
    }
    .ngu-reveal:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: -2px;
    }
    .ngu-check {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .ngu-fieldset {
      min-inline-size: 0;
      border: 0;
      padding: 0;
      margin: 0;
    }
    .ngu-fieldset legend {
      padding: 0;
      margin-block-end: 0.375rem;
    }
    .ngu-check-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.75rem;
    }
    .ngu-policy {
      color: var(--ngu-primary, #1a73e8);
    }
    .ngu-switch input {
      appearance: none;
      position: relative;
      flex: none;
      inline-size: 2.25rem;
      block-size: 1.25rem;
      margin: 0;
      border: 1px solid var(--ngu-switch-off, #767676);
      border-radius: 999px;
      background: var(--ngu-switch-off, #767676);
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .ngu-switch input::before {
      content: '';
      position: absolute;
      inset-block-start: 0.125rem;
      inset-inline-start: 0.125rem;
      inline-size: 0.875rem;
      block-size: 0.875rem;
      border-radius: 50%;
      background: #fff;
      transition: translate 0.15s;
    }
    .ngu-switch input:checked {
      border-color: var(--ngu-primary, #1a73e8);
      background: var(--ngu-primary, #1a73e8);
    }
    .ngu-switch input:checked::before {
      translate: 1rem;
    }
    .ngu-switch input:checked:dir(rtl)::before {
      translate: -1rem;
    }
    .ngu-switch input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    .ngu-error,
    .ngu-hint,
    .ngu-pending,
    .ngu-counter {
      margin: 0;
      font-size: 0.8125rem;
    }
    .ngu-error,
    .ngu-counter--over {
      color: var(--ngu-error-color, #c62828);
    }
    .ngu-hint,
    .ngu-pending,
    .ngu-counter {
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-counter {
      align-self: flex-end;
      font-variant-numeric: tabular-nums;
    }
    /* Masked values such as phone numbers stay left to right, aligned to the start in RTL forms. */
    .ngu-control:dir(rtl) > input[dir='ltr'] {
      text-align: right;
    }
    .ngu-warning {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--ngu-warning-color, #8a5300);
      display: flex;
      gap: 0.375rem;
      align-items: baseline;
    }
    .ngu-warning__mark {
      flex: none;
      display: inline-grid;
      place-items: center;
      inline-size: 1rem;
      block-size: 1rem;
      border-radius: 50%;
      background: var(--ngu-warning-color, #8a5300);
      color: var(--ngu-warning-on, #fff);
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1;
    }
    :host(.ngu-field--warning) input,
    :host(.ngu-field--warning) textarea,
    :host(.ngu-field--warning) .ngu-control--adorned {
      border-color: var(--ngu-warning-color, #8a5300);
    }
    .ngu-skeleton {
      display: block;
      block-size: 2.375rem;
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-skeleton-color, rgba(127, 127, 127, 0.16));
      animation: ngu-pulse 1.4s ease-in-out infinite;
    }
    .ngu-skeleton--area {
      block-size: 5rem;
    }
    .ngu-skeleton--box {
      inline-size: 1rem;
      block-size: 1rem;
      border-radius: 0.25rem;
    }
    @keyframes ngu-pulse {
      50% {
        opacity: 0.55;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ngu-skeleton {
        animation: none;
      }
    }
    /* Windows high contrast: colors (outlines included) are forced, so states use borders. */
    @media (forced-colors: active) {
      .ngu-skeleton {
        border: 1px dashed GrayText;
      }
      .ngu-warning__mark {
        border: 1px solid CanvasText;
      }
      :host(.ngu-field--invalid) input,
      :host(.ngu-field--invalid) select,
      :host(.ngu-field--invalid) textarea,
      :host(.ngu-field--invalid) .ngu-control--adorned {
        border-width: 2px;
      }
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
  `,
})
export class NguField {
  readonly def = input.required<LeafDef>();
  readonly field = input.required<Field<any>>();
  /** Dot path of this field inside the form, for template overrides. */
  readonly path = input<string>('');

  protected readonly id = `ngu-field-${nextId++}`;
  protected readonly state = computed(() => this.field()());

  private readonly context = inject(NguFormContext, { optional: true });
  protected readonly i18n = this.context?.i18n ?? injectNguI18n();
  private readonly registeredTypes = inject(NGU_FIELD_TYPES, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  // --- texts, through the app's translations ------------------------------

  protected readonly label = computed(() => this.i18n.text(this.def().label));
  protected readonly hint = computed(() => this.i18n.text(this.def().hint));
  protected readonly placeholder = computed(() => this.i18n.text(this.def().placeholder) ?? '');
  protected readonly prefix = computed(() => this.i18n.text(this.def().prefix));
  protected readonly suffix = computed(() => this.i18n.text(this.def().suffix));
  protected readonly pendingText = computed(
    () => this.i18n.text(this.def().pendingText) ?? this.i18n.message('checking'),
  );
  /** Placeholders replace the controls while the form's data loads. */
  protected readonly loading = computed(() => this.context?.loading() ?? false);

  /**
   * True once the user really left the control. Browser autofill (Chrome's password
   * manager, for one) fires focus and blur on every field it fills, which would mark
   * them touched. Those inputs match `:autofill` at that moment, so they are ignored.
   */
  private readonly interacted = linkedSignal({
    source: () => this.context?.resets() ?? 0,
    computation: () => false,
  });

  /** Whether messages may show yet: after a submit attempt, or per `errorsOn` once the user left the field. */
  private readonly messagesDue = computed(() => {
    if (this.context?.submitAttempted()) {
      return true;
    }
    const s = this.state();
    if (!s.touched() || !this.interacted()) {
      return false;
    }
    switch (this.def().errorsOn ?? this.context?.errorsOn() ?? 'dirty') {
      case 'touched':
        return true;
      case 'dirty':
        return s.dirty();
      case 'submit':
        return false;
    }
  });

  protected readonly showErrors = computed(() => this.state().errors().length > 0 && this.messagesDue());

  protected readonly message = computed(() => {
    const first = this.state().errors()[0];
    return first ? this.i18n.error(first, this.def()) : undefined;
  });

  /** The first `warn` message, shown when there is no error to show. */
  protected readonly warning = computed(() => {
    if (this.showErrors() || !this.messagesDue()) {
      return undefined;
    }
    const first = this.state().metadata(NGU_WARNINGS)?.()?.[0];
    return first ? (this.i18n.text(first.message) ?? this.i18n.message('invalid', { label: this.label() ?? '' })) : undefined;
  });

  protected readonly choices = computed<readonly Choice<any>[]>(() => {
    const c = this.def().choices;
    let list: readonly Choice<any>[];
    if (!c) {
      return [];
    } else if (isSignal(c)) {
      list = c();
    } else if (typeof c === 'function') {
      list = this.state().metadata(NGU_CHOICES)?.() ?? [];
    } else {
      list = c;
    }
    return list.map((choice) => {
      const label = this.i18n.text(choice.label);
      return label === choice.label ? choice : { ...choice, label };
    });
  });

  // --- value transforms ------------------------------------------------------

  /** Parse and format for masks, locale numbers and `parse`/`format`; undefined for plain inputs. */
  protected readonly transform = computed<FieldTransform | undefined>(() => {
    const d = this.def();
    if (d.mask) {
      return maskTransform(d.mask);
    }
    if (d.type === 'currency' || (d.type === 'number' && d.localized)) {
      const options = d.type === 'currency' ? currencyOptions(d.currency) : numberOptions(d.localized);
      const locale = this.i18n.locale();
      return {
        parse: d.parse ?? ((text) => parseLocalNumber(text, locale, options)),
        format: d.format ?? ((value) => formatLocalNumber(value, locale, options)),
      };
    }
    if (d.parse || d.format) {
      const number = d.type === 'number' || d.type === 'currency';
      return {
        parse: d.parse ?? (number ? (text) => parseLocalNumber(text, 'en-US') : (text) => text),
        format: d.format ?? ((value) => (value == null ? '' : String(value))),
      };
    }
    return undefined;
  });

  // --- password strength -------------------------------------------------------

  protected readonly strength = computed(() => {
    const d = this.def();
    const options = d.type === 'password' ? strengthOptions(d.strength) : undefined;
    if (!options) {
      return undefined;
    }
    const value = this.state().value();
    return {
      value: typeof value === 'string' ? value : '',
      options,
      minLength: d.minLength ?? DEFAULT_PASSWORD_LENGTH,
    };
  });
  // --- adornments ----------------------------------------------------------

  /** Password is shown as text. Hidden again on reset and on every submit. */
  protected readonly revealed = linkedSignal({
    source: () => [this.context?.resets() ?? 0, this.context?.submits() ?? 0],
    computation: () => false,
  });
  protected readonly revealStatus = signal('');
  protected readonly revealable = computed(() => this.def().type === 'password' && this.def().reveal !== false);
  protected readonly adorned = computed(() => {
    const d = this.def();
    return Boolean(d.prefix || d.suffix || this.revealable());
  });

  protected readonly counter = computed(() => {
    const d = this.def();
    const max = d.maxLength;
    if (max == null || d.counter === false || (d.type !== 'text' && d.type !== 'textarea' && !d.counter)) {
      return undefined;
    }
    const value = this.state().value();
    const length = typeof value === 'string' ? value.length : 0;
    const left = max - length;
    const text =
      left >= 0
        ? this.i18n.message('charactersLeft', { count: left })
        : this.i18n.message('charactersOver', { count: -left });
    return { length, max, left, text };
  });

  protected readonly inputMode = computed<InputMode | null>(() => {
    const d = this.def();
    if (d.inputmode) {
      return d.inputmode;
    }
    if (d.type === 'email') {
      return 'email';
    }
    if (d.type === 'currency') {
      return typeof d.min === 'number' && d.min >= 0 ? 'decimal' : null;
    }
    if (d.mask) {
      return /^[^a*]*$/.test(d.mask) ? 'numeric' : null;
    }
    // Numeric keypads on phones have no minus key, so only for values that cannot go negative.
    if (d.type === 'number' && typeof d.min === 'number' && d.min >= 0) {
      const fractions =
        (d.step != null && !Number.isInteger(d.step)) ||
        (this.transform() !== undefined && numberOptions(d.localized).maximumFractionDigits !== 0);
      return fractions ? 'decimal' : 'numeric';
    }
    return null;
  });

  protected readonly describedBy = computed(() => {
    const d = this.def();
    const ids: string[] = [];
    if (d.prefix) {
      ids.push(`${this.id}-prefix`);
    }
    if (d.suffix) {
      ids.push(`${this.id}-suffix`);
    }
    if (this.showErrors() || this.state().pending() || this.warning() || d.hint) {
      ids.push(`${this.id}-msg`);
    }
    if (this.counter()) {
      ids.push(`${this.id}-count`);
    }
    if (this.multiHint()) {
      ids.push(`${this.id}-multi`);
    }
    if (this.strength()) {
      ids.push(`${this.id}-strength`);
    }
    return ids.length ? ids.join(' ') : null;
  });
  /** `aria-invalid` value: set only while the error is shown, so untouched fields stay neutral. */
  protected readonly invalidAttr = computed(() => (this.showErrors() ? 'true' : null));

  // --- built-in types ------------------------------------------------------

  /** How the label sits around the control. */
  protected readonly layout = computed<'check' | 'fieldset' | 'plain' | 'input'>(() => {
    const d = this.def();
    switch (d.type) {
      case 'checkbox':
        return d.multiple ? 'fieldset' : 'check';
      case 'switch':
      case 'consent':
        return 'check';
      case 'radio':
      case 'segmented':
      case 'rating':
      case 'daterange':
        return 'fieldset';
      case 'captcha':
        return 'plain';
      default:
        return 'input';
    }
  });
  /** Radios, buttons and stars form a `radiogroup`; checkboxes and date ranges a plain group. */
  protected readonly radioLike = computed(() => ['radio', 'segmented', 'rating'].includes(this.def().type));

  /** The native input type: text for typed numbers, and for types without a native input. */
  protected readonly inputType = computed(() => {
    const type = this.def().type;
    if (type === 'password') {
      return this.revealed() ? 'text' : 'password';
    }
    return NATIVE_TYPES.has(type) && !(type === 'number' && this.transform()) ? type : 'text';
  });
  protected readonly enterKeyHint = computed(() => this.def().enterkeyhint ?? (this.def().type === 'search' ? 'search' : null));
  /** `min` and `max` attributes of time, month and week inputs, written in their own format. */
  protected readonly textBounds = computed(() => {
    const d = this.def();
    const temporal = d.type === 'time' || d.type === 'datetime-local' || d.type === 'month' || d.type === 'week';
    return {
      min: temporal && typeof d.min === 'string' ? d.min : null,
      max: temporal && typeof d.max === 'string' ? d.max : null,
    };
  });
  protected readonly ratingCount = computed(() => {
    const max = this.def().max;
    return typeof max === 'number' && max > 0 ? Math.round(max) : 5;
  });
  /** The slider's value as shown and read: "40 kg", "₹ 1,200". */
  protected readonly rangeText = computed(() => {
    const value = this.state().value();
    const shown = typeof value === 'number' && !Number.isNaN(value) ? this.i18n.number(value) : '';
    return [this.prefix(), shown, this.suffix()].filter(Boolean).join(' ');
  });
  protected readonly selectSize = computed(() =>
    this.def().multiple ? Math.min(Math.max(this.choices().length, 2), 8) : null,
  );
  /** Multiple selects need Ctrl or ⌘ with a mouse; phones show their own picker. */
  protected readonly multiHint = computed(
    () => this.def().type === 'select' && !!this.def().multiple && FINE_POINTER,
  );

  // --- overrides -----------------------------------------------------------

  protected readonly fieldTemplate = computed(() => this.context?.fieldTemplates().get(this.path()));
  protected readonly controlTemplate = computed(() => this.context?.controlTemplates().get(this.path()));
  protected readonly customRenderer = computed<Type<unknown> | undefined>(() => {
    const type = this.def().type;
    const registries = this.registeredTypes ?? [];
    for (let i = registries.length - 1; i >= 0; i--) {
      const cmp = registries[i][type];
      if (cmp) {
        return cmp;
      }
    }
    return undefined;
  });
  protected readonly slot = computed<'template' | 'custom' | 'builtin'>(() => {
    if (this.controlTemplate()) {
      return 'template';
    }
    if (this.customRenderer()) {
      return 'custom';
    }
    return 'builtin';
  });
  protected readonly templateContext = computed<NguFieldContext>(() => {
    const field = this.field();
    return {
      $implicit: field,
      field,
      def: this.def(),
      state: this.state(),
      id: this.id,
      message: this.showErrors() ? this.message() : undefined,
      showErrors: this.showErrors(),
      describedBy: this.describedBy() ?? undefined,
    };
  });
  /** Only the inputs the renderer declares are passed. */
  protected readonly rendererInputs = computed<Record<string, unknown>>(() => {
    const cmp = this.customRenderer();
    if (!cmp) {
      return {};
    }
    const declared = new Set(reflectComponentType(cmp)?.inputs.map((i) => i.templateName) ?? []);
    const all: Record<string, unknown> = {
      field: this.field(),
      def: this.def(),
      id: this.id,
      invalid: this.showErrors(),
      describedBy: this.describedBy() ?? undefined,
    };
    return Object.fromEntries(Object.entries(all).filter(([k]) => declared.has(k)));
  });

  // --- change hooks ----------------------------------------------------------

  /** Time of the last input, change or click inside this field. */
  private gestureAt = Number.NEGATIVE_INFINITY;
  private lastValue: unknown = UNSET;

  constructor() {
    // The error summary lists registered fields and focuses them from its links.
    if (this.context) {
      const self = this;
      const unregister = this.context.register({
        id: this.id,
        message: computed(() => (this.state().errors().length ? this.message() : undefined)),
        element: this.host.nativeElement,
        get field() {
          return self.field();
        },
        focus: () => this.focusControl(),
      });
      inject(DestroyRef).onDestroy(unregister);
    }

    // `onChange` fires for value changes that follow the user's own input in this field.
    // Writes from code (patch, reset, compute, another field's onChange) have no gesture,
    // so a hook can never trigger itself or another hook in a loop.
    effect(() => {
      if (!this.def().onChange) {
        return;
      }
      const value = this.state().value();
      untracked(() => this.notifyChange(value));
    });

    // Autosize: grow the textarea between `rows` and `maxRows`.
    afterRenderEffect({
      write: () => {
        const { type, rows, maxRows } = this.def();
        if (type !== 'textarea' || !maxRows) {
          return;
        }
        this.state().value();
        const el = this.textarea()?.nativeElement;
        if (el) {
          autosize(el, rows ?? 2, maxRows);
        }
      },
    });
  }

  protected onGesture(): void {
    this.gestureAt = now();
  }

  protected toggleReveal(): void {
    const next = !this.revealed();
    this.revealed.set(next);
    this.revealStatus.set(this.i18n.message(next ? 'passwordShown' : 'passwordHidden'));
  }

  /** Focuses the checked radio or the first control, and brings the field into view. */
  focusControl(): void {
    const host = this.host.nativeElement;
    const target =
      host.querySelector<HTMLElement>('input[type="radio"]:checked') ??
      host.querySelector<HTMLElement>(FOCUSABLE) ??
      host.querySelector<HTMLElement>('.ngu-captcha');
    host.scrollIntoView?.({ block: 'center' });
    target?.focus({ preventScroll: true });
  }

  protected onFocusOut(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || isAutofilled(target)) {
      return;
    }
    this.interacted.set(true);
    // "example.com" becomes "https://example.com" when the user leaves a URL field.
    const state = this.state();
    const value = state.value();
    if (this.def().type === 'url' && typeof value === 'string' && !state.readonly()) {
      const full = withScheme(value);
      if (full !== value) {
        state.value.set(full);
      }
    }
  }

  private notifyChange(value: unknown): void {
    const previous = this.lastValue;
    this.lastValue = value;
    const onChange = this.def().onChange;
    if (!onChange || previous === UNSET || Object.is(previous, value)) {
      return;
    }
    if (now() - this.gestureAt > GESTURE_WINDOW_MS + (this.def().debounce ?? 0)) {
      return;
    }
    this.gestureAt = Number.NEGATIVE_INFINITY;
    const nodes = this.state().metadata(NGU_NODES)?.();
    if (!nodes) {
      return;
    }
    const root = nodes.root();
    const scope = nodes.scope();
    const ctx: ChangeContext<unknown, unknown, unknown> = {
      previous,
      model: root.value(),
      scope: scope.value(),
      patch: (partial) => root.value.update((v: unknown) => deepMerge(v, partial)),
      patchItem: (partial) => scope.value.update((v: unknown) => deepMerge(v, partial)),
    };
    onChange(value, ctx);
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function autosize(el: HTMLTextAreaElement, minRows: number, maxRows: number): void {
  const style = getComputedStyle(el);
  const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 24;
  const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  const min = line * minRows + padding + border;
  const max = line * maxRows + padding + border;
  el.style.height = 'auto';
  const wanted = el.scrollHeight + border;
  el.style.height = `${Math.min(Math.max(wanted, min), max)}px`;
  el.style.overflowY = wanted > max ? 'auto' : 'hidden';
}
