import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  ErrorHandler,
  inject,
  input,
  isSignal,
  reflectComponentType,
  linkedSignal,
  PendingTasks,
  signal,
  untracked,
  viewChild,
  type TemplateRef,
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
import {
  findFieldType,
  isComponentType,
  loadedFieldType,
  loadFieldType,
  NGU_FIELD_TYPES,
  type NguFieldTypeLoader,
} from '../field-types';
import { findIcon, NGU_ICONS } from '../icons';
import { NGU_FIELD_RENDERERS, type NguFieldRenderContext } from '../renderers';
import { isDevMode, nguWarn } from '../diagnostics';
import { extendLook, injectOuterLook, NGU_LOOK, slotClass } from '../look';
import { deepMerge, NGU_CHOICES, NGU_NODES, NGU_PATH, NGU_WARNINGS } from '../internal';
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
import { toLeafDef, type ChangeContext, type Choice, type InputMode, type LeafDef, type NguFieldSpec } from '../types';
import { NguFormContext } from './ngu-form-context';
import { NguSection } from './ngu-section';
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

/** Every type ngu-form renders without a registered renderer. */
const BUILT_IN_TYPES = new Set([
  ...NATIVE_TYPES,
  'textarea',
  'checkbox',
  'select',
  'radio',
  'color',
  'range',
  'switch',
  'segmented',
  'currency',
  'rating',
  'daterange',
  'otp',
  'phone',
  'tags',
  'consent',
  'captcha',
]);

/** Where the renderers of types from ngu-form's own entry points come from. */
const PROVIDER_HINTS: Readonly<Record<string, string>> = {
  file: "Add provideNguUpload() from 'ngu-form/upload'.",
  image: "Add provideNguUpload() from 'ngu-form/upload'.",
  signature: "Add provideNguUpload() from 'ngu-form/upload'.",
  dropdown: "Add provideNguDropdown() from 'ngu-form/dropdown'.",
};

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
  providers: [{ provide: NGU_LOOK, useFactory: () => inject(NguField).look }],
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
    '[attr.data-ngu-path]': 'modelPath()',
    '[attr.data-ngu-type]': 'def().type',
    '[class]': 'hostClass()',
    '[class.ngu-unstyled]': "look().theme === 'none'",
    '[attr.data-invalid]': "showErrors() ? '' : null",
    '[attr.data-warning]': "warning() ? '' : null",
    '[attr.data-required]': "state().required() ? '' : null",
    '[attr.data-disabled]': "state().disabled() ? '' : null",
    '[attr.data-readonly]': "state().readonly() ? '' : null",
    '[attr.data-pending]': "state().pending() ? '' : null",
    '[class.ngu-field--invalid]': 'showErrors()',
    '[class.ngu-field--warning]': '!!warning()',
    '[class.ngu-field--loading]': 'loading()',
    '[class.ngu-field--disabled]': 'state().disabled()',
    '[class.ngu-field--pending]': 'state().pending()',
    '[class.ngu-field--computed]': '!!def().compute',
    '[class.ngu-field--compact]': 'compact()',
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
          <span class="ngu-label" [class]="look().classes.label">{{ label() }}@if (state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</span>
        }
        <span class="ngu-skeleton" [class.ngu-skeleton--area]="d.type === 'textarea'" aria-hidden="true"></span>
      }
    } @else if (fieldTemplate(); as tpl) {
      <ng-container *ngTemplateOutlet="tpl; context: templateContext()" />
    } @else if (slot() === 'whole') {
      <ng-container *ngComponentOutlet="wholeRenderer()!; inputs: { context: renderContext() }" />
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
        @case ('loading') {
          <ng-container *ngTemplateOutlet="labelTpl" />
          <span class="ngu-skeleton" aria-hidden="true"></span>
        }
        @default {
          @switch (layout()) {
            @case ('check') {
              <span class="ngu-check-row">
                <label class="ngu-check" [class]="look().classes.label" [class.ngu-switch]="d.type === 'switch'" [for]="id">
                  @switch (d.type) {
                    @case ('consent') {
                      <input type="checkbox" nguConsent [class]="look().classes.check" [id]="id" [formField]="field()" [attr.aria-invalid]="invalidAttr()" [attr.aria-describedby]="describedBy()" />
                    }
                    @case ('switch') {
                      <input type="checkbox" role="switch" [class]="look().classes.check" [id]="id" [formField]="field()" [attr.aria-invalid]="invalidAttr()" [attr.aria-describedby]="describedBy()" />
                    }
                    @default {
                      <input type="checkbox" [class]="look().classes.check" [id]="id" [formField]="field()" [attr.aria-invalid]="invalidAttr()" [attr.aria-describedby]="describedBy()" />
                    }
                  }
                  <span class="ngu-check__text">{{ label() }}@if (d.type !== 'checkbox' && state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</span>
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
                  <legend class="ngu-label" [class]="look().classes.label" [id]="id + '-legend'">{{ label() }}@if (state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</legend>
                }
                @switch (d.type) {
                  @case ('rating') {
                    @defer (on immediate; hydrate on immediate) {
                      <ngu-rating [formField]="field()" [count]="ratingCount()" [i18n]="i18n" />
                    } @placeholder {
                      <span class="ngu-skeleton" aria-hidden="true"></span>
                    }
                  }
                  @case ('daterange') {
                    @defer (on immediate; hydrate on immediate) {
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
                  <span class="ngu-label" [class]="look().classes.label" [id]="id + '-label'">{{ label() }}</span>
                }
                @defer (on immediate; hydrate on immediate) {
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
                  @defer (on immediate; hydrate on immediate) {
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
                  @defer (on immediate; hydrate on immediate) {
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
                  @defer (on immediate; hydrate on immediate) {
                    <ngu-range [field]="field()" [id]="id" [step]="d.step" [text]="rangeText()" [errorShown]="showErrors()" [describedBy]="describedBy() ?? undefined" />
                  } @placeholder {
                    <span class="ngu-skeleton" aria-hidden="true"></span>
                  }
                }
                @case ('color') {
                  @defer (on immediate; hydrate on immediate) {
                    <ngu-color [field]="field()" [id]="id" [errorShown]="showErrors()" [describedBy]="describedBy() ?? undefined" />
                  } @placeholder {
                    <span class="ngu-skeleton" aria-hidden="true"></span>
                  }
                }
                @case ('otp') {
                  @defer (on immediate; hydrate on immediate) {
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
                  <div class="ngu-control" [class]="adorned() ? look().classes.adorned : ''" [class.ngu-control--adorned]="adorned()">
                    @if (prefixIcon(); as icon) {
                      <span class="ngu-icon ngu-icon--prefix" [class]="look().classes.affix" aria-hidden="true" (click)="focusInput()">
                        <ng-container *ngTemplateOutlet="adornmentTpl; context: { $implicit: icon }" />
                      </span>
                    }
                    @if (prefix()) {
                      <span class="ngu-affix ngu-prefix" [class]="look().classes.affix" [id]="id + '-prefix'">{{ prefix() }}</span>
                    }
                    @switch (d.type) {
                      @case ('textarea') {
                        @if (transform(); as t) {
                          <textarea
                            #textarea
                            [class]="look().classes.control"
                            [attr.data-adorned]="adorned() ? '' : null"
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
                            [class]="look().classes.control"
                            [attr.data-adorned]="adorned() ? '' : null"
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
                          [class]="look().classes.control"
                          [attr.data-adorned]="adorned() ? '' : null"
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
                            [class]="look().classes.control"
                            [attr.data-adorned]="adorned() ? '' : null"
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
                            [class]="look().classes.control"
                            [attr.data-adorned]="adorned() ? '' : null"
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
                      <span class="ngu-affix ngu-suffix" [class]="look().classes.affix" [id]="id + '-suffix'">{{ suffix() }}</span>
                    }
                    @if (suffixIcon(); as icon) {
                      <span class="ngu-icon ngu-icon--suffix" [class]="look().classes.affix" aria-hidden="true" (click)="focusInput()">
                        <ng-container *ngTemplateOutlet="adornmentTpl; context: { $implicit: icon }" />
                      </span>
                    }
                    @if (revealable()) {
                      <button
                        type="button"
                        class="ngu-reveal"
                        [class]="look().classes.button"
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
                    <p class="ngu-hint" [class]="look().classes.hint" [id]="id + '-multi'">{{ i18n.message('multiSelectHint') }}</p>
                  }
                  @if (counter(); as c) {
                    <p class="ngu-counter" [class]="look().classes.hint" [class.ngu-counter--over]="c.left < 0" aria-hidden="true">{{ c.length }} / {{ c.max }}</p>
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
        <p class="ngu-error" [class]="look().classes.error" [id]="id + '-msg'">{{ message() }}</p>
      } @else if (state().pending()) {
        <p class="ngu-pending" [class]="look().classes.hint" [id]="id + '-msg'" aria-live="polite">{{ pendingText() }}</p>
      } @else if (warning(); as w) {
        <p class="ngu-warning" [class]="look().classes.warning" [id]="id + '-msg'"><span class="ngu-warning__mark" aria-hidden="true">!</span><span class="ngu-sr-only">{{ i18n.message('warningPrefix') }} </span>{{ w }}</p>
      } @else if (hint()) {
        <p class="ngu-hint" [class]="look().classes.hint" [id]="id + '-msg'">{{ hint() }}</p>
      }
    }

    <ng-template #adornmentTpl let-icon>
      @if (icon.template) {
        <ng-container *ngTemplateOutlet="icon.template; context: templateContext()" />
      } @else {
        <ng-container *ngComponentOutlet="icon.component" />
      }
    </ng-template>

    <ng-template #labelTpl>
      @if (label()) {
        <label class="ngu-label" [class]="look().classes.label" [id]="id + '-label'" [for]="id">{{ label() }}@if (state().required()) {<span class="ngu-required" aria-hidden="true">*</span>}</label>
      }
    </ng-template>
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-field-gap, var(--_ngu-field-gap, 0.375rem));
      min-inline-size: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-label {
      font-size: var(--ngu-label-size, var(--_ngu-label-size, 0.875rem));
      font-weight: 500;
      color: var(--ngu-label-color, inherit);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-required {
      color: var(--ngu-error-color, #c62828);
      margin-inline-start: 0.125rem;
    }
    :host(:where(:not(.ngu-unstyled))) input:not([type='checkbox']):not([type='radio']),
    :host(:where(:not(.ngu-unstyled))) select,
    :host(:where(:not(.ngu-unstyled))) textarea {
      font: inherit;
      padding: var(--ngu-input-padding, var(--_ngu-input-padding, 0.5rem 0.75rem));
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      color: inherit;
      inline-size: 100%;
      box-sizing: border-box;
    }
    :host(:where(:not(.ngu-unstyled))) input[readonly],
    :host(:where(:not(.ngu-unstyled))) textarea[readonly] {
      background: var(--ngu-readonly-bg, rgba(127, 127, 127, 0.08));
    }
    :host(:where(:not(.ngu-unstyled))) textarea {
      min-block-size: 5rem;
      resize: vertical;
      line-height: var(--ngu-textarea-line-height, 1.5);
    }
    :host(:where(:not(.ngu-unstyled))) textarea.ngu-rows {
      min-block-size: 0;
    }
    :host(:where(:not(.ngu-unstyled))) textarea.ngu-autosize {
      resize: none;
    }
    :host(:where(:not(.ngu-unstyled))) input:focus-visible,
    :host(:where(:not(.ngu-unstyled))) select:focus-visible,
    :host(:where(:not(.ngu-unstyled))) textarea:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    :host(.ngu-field--invalid:not(.ngu-unstyled)) input,
    :host(.ngu-field--invalid:not(.ngu-unstyled)) select,
    :host(.ngu-field--invalid:not(.ngu-unstyled)) textarea,
    :host(.ngu-field--invalid:not(.ngu-unstyled)) .ngu-control--adorned {
      border-color: var(--ngu-error-color, #c62828);
    }
    :host(.ngu-field--disabled:not(.ngu-unstyled)) {
      opacity: 0.6;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control {
      display: flex;
      align-items: stretch;
      min-inline-size: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control > input,
    :host(:where(:not(.ngu-unstyled))) .ngu-control > select,
    :host(:where(:not(.ngu-unstyled))) .ngu-control > textarea {
      flex: 1 1 auto;
      min-inline-size: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned {
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > input,
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > select,
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > textarea {
      border: 0;
      background: transparent;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned:has(> input:focus-visible, > select:focus-visible, > textarea:focus-visible) {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > input:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > select:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > textarea:focus-visible {
      outline: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-affix {
      display: flex;
      align-items: center;
      padding-inline: 0.75rem;
      color: var(--ngu-hint-color, #6b6b6b);
      white-space: nowrap;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-icon {
      display: flex;
      align-items: center;
      padding-inline: 0.75rem 0;
      color: var(--ngu-hint-color, #6b6b6b);
      font-size: 1.125em;
      line-height: 0;
      cursor: text;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-icon--suffix {
      padding-inline: 0 0.75rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > .ngu-icon--prefix + input,
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > .ngu-icon--prefix + select,
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > .ngu-icon--prefix + .ngu-prefix {
      padding-inline-start: 0.5rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-prefix {
      padding-inline-end: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-suffix {
      padding-inline-start: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > .ngu-prefix + input,
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > .ngu-prefix + select {
      padding-inline-start: 0.375rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > input:has(+ .ngu-suffix),
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > select:has(+ .ngu-suffix),
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > input:has(+ .ngu-icon--suffix),
    :host(:where(:not(.ngu-unstyled))) .ngu-control--adorned > select:has(+ .ngu-icon--suffix) {
      padding-inline-end: 0.375rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-reveal {
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
    :host(:where(:not(.ngu-unstyled))) .ngu-reveal:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: -2px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-check {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-fieldset {
      min-inline-size: 0;
      border: 0;
      padding: 0;
      margin: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-fieldset legend {
      padding: 0;
      margin-block-end: 0.375rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-check-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.75rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-policy {
      color: var(--ngu-primary, #1a73e8);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-switch input {
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
    :host(:where(:not(.ngu-unstyled))) .ngu-switch input::before {
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
    :host(:where(:not(.ngu-unstyled))) .ngu-switch input:checked {
      border-color: var(--ngu-primary, #1a73e8);
      background: var(--ngu-primary, #1a73e8);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-switch input:checked::before {
      translate: 1rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-switch input:checked:dir(rtl)::before {
      translate: -1rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-switch input:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-error,
    :host(:where(:not(.ngu-unstyled))) .ngu-hint,
    :host(:where(:not(.ngu-unstyled))) .ngu-pending,
    :host(:where(:not(.ngu-unstyled))) .ngu-counter {
      margin: 0;
      font-size: 0.8125rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-error,
    :host(:where(:not(.ngu-unstyled))) .ngu-counter--over {
      color: var(--ngu-error-color, #c62828);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-hint,
    :host(:where(:not(.ngu-unstyled))) .ngu-pending,
    :host(:where(:not(.ngu-unstyled))) .ngu-counter {
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-counter {
      align-self: flex-end;
      font-variant-numeric: tabular-nums;
    }
    /* Masked values such as phone numbers stay left to right, aligned to the start in RTL forms. */
    :host(:where(:not(.ngu-unstyled))) .ngu-control:dir(rtl) > input[dir='ltr'] {
      text-align: right;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-warning {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--ngu-warning-color, #8a5300);
      display: flex;
      gap: 0.375rem;
      align-items: baseline;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-warning__mark {
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
    :host(.ngu-field--warning:not(.ngu-unstyled)) input,
    :host(.ngu-field--warning:not(.ngu-unstyled)) textarea,
    :host(.ngu-field--warning:not(.ngu-unstyled)) .ngu-control--adorned {
      border-color: var(--ngu-warning-color, #8a5300);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-skeleton {
      display: block;
      block-size: 2.375rem;
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-skeleton-color, rgba(127, 127, 127, 0.16));
      animation: ngu-pulse 1.4s ease-in-out infinite;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-skeleton--area {
      block-size: 5rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-skeleton--box {
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
      :host(:where(:not(.ngu-unstyled))) .ngu-skeleton {
        animation: none;
      }
    }
    /* Windows high contrast: colors (outlines included) are forced, so states use borders. */
    @media (forced-colors: active) {
      :host(:where(:not(.ngu-unstyled))) .ngu-skeleton {
        border: 1px dashed GrayText;
      }
      :host(:where(:not(.ngu-unstyled))) .ngu-warning__mark {
        border: 1px solid CanvasText;
      }
      :host(.ngu-field--invalid:not(.ngu-unstyled)) input,
      :host(.ngu-field--invalid:not(.ngu-unstyled)) select,
      :host(.ngu-field--invalid:not(.ngu-unstyled)) textarea,
      :host(.ngu-field--invalid:not(.ngu-unstyled)) .ngu-control--adorned {
        border-width: 2px;
      }
    }
    .ngu-sr-only,
    :host(.ngu-field--compact) .ngu-label,
    :host(.ngu-field--compact) .ngu-check__text,
    :host(.ngu-field--compact) .ngu-hint {
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
    @media print {
      :host(:not(.ngu-unstyled)) {
        break-inside: avoid;
      }
      :host(:where(:not(.ngu-unstyled))) .ngu-reveal,
      :host(:where(:not(.ngu-unstyled))) .ngu-counter {
        display: none;
      }
      :host(:where(:not(.ngu-unstyled))) input,
      :host(:where(:not(.ngu-unstyled))) select,
      :host(:where(:not(.ngu-unstyled))) textarea {
        background: none !important;
        color: #000 !important;
      }
    }
  `,
})
export class NguField {
  /** The field's definition: from a form, or a plain spec when the field is used on its own. */
  readonly def = input.required<LeafDef, LeafDef | NguFieldSpec>({ transform: toLeafDef });
  /**
   * The field to render: a node of the form's tree, set by ngu-form, or a field of your own
   * `form()` when used alone.
   */
  readonly field = input.required<Field<any>>();
  /** Dot path of this field inside the form, for template overrides. */
  readonly path = input<string>('');
  /** Inside a table cell: the label and hint are kept for screen readers but not shown. */
  readonly compact = input(false);

  protected readonly id = `ngu-field-${nextId++}`;
  /** The field's model path, `items.0.sku`; for tests, tools and the debug panel. */
  protected readonly modelPath = computed(() => this.state().metadata(NGU_PATH)?.() ?? (this.path() || null));
  protected readonly state = computed(() => this.field()());

  private readonly context = inject(NguFormContext, { optional: true });
  private readonly section = inject(NguSection, { optional: true });
  protected readonly i18n = this.context?.i18n ?? injectNguI18n();
  private readonly registeredTypes = inject(NGU_FIELD_TYPES, { optional: true });
  private readonly fieldRenderers = inject(NGU_FIELD_RENDERERS, { optional: true });
  private readonly icons = inject(NGU_ICONS, { optional: true });
  private readonly outerLook = injectOuterLook();
  /** The look around this field with the `classes` of its spec; controls inside it read this one. */
  readonly look = computed(() => extendLook(this.outerLook(), this.def().classes));
  protected readonly hostClass = computed(() => slotClass(this.look(), 'field', this.def().class));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly errorHandler = inject(ErrorHandler);
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
  /**
   * True once autofill blurred the field. Only then does a touch need the user's own blur:
   * a field touched by code, such as Signal Forms' `submit()` around a lone `<ngu-field>`,
   * shows its errors.
   */
  private readonly autofillBlurred = linkedSignal({
    source: () => this.context?.resets() ?? 0,
    computation: () => false,
  });

  /** Whether messages may show yet: after a submit attempt, or per `errorsOn` once the user left the field. */
  private readonly messagesDue = computed(() => {
    if (this.context?.submitAttempted() || this.section?.attempted()) {
      return true;
    }
    const s = this.state();
    if (!s.touched() || (!this.interacted() && this.autofillBlurred())) {
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
  protected readonly prefixIcon = computed(() => this.adornment('prefix'));
  protected readonly suffixIcon = computed(() => this.adornment('suffix'));
  protected readonly adorned = computed(() => {
    const d = this.def();
    return Boolean(d.prefix || d.suffix || this.prefixIcon() || this.suffixIcon() || this.revealable());
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
  /** The registered control renderer for this type: a component, or a loader for one. */
  private readonly registeredRenderer = computed(() => findFieldType(this.registeredTypes, this.def().type));
  /** The registered whole-field renderer for this type, such as a Material form field. */
  private readonly registeredWhole = computed(() => findFieldType(this.fieldRenderers, this.def().type));
  /** Renderers that loaded while this field was on screen. */
  private readonly loadedRenderers = signal<ReadonlyMap<NguFieldTypeLoader, Type<unknown>>>(new Map());
  protected readonly customRenderer = computed<Type<unknown> | undefined>(() => {
    const entry = this.registeredRenderer();
    if (!entry) {
      return undefined;
    }
    if (isComponentType(entry)) {
      return entry;
    }
    return loadedFieldType(entry) ?? this.loadedRenderers().get(entry);
  });
  protected readonly wholeRenderer = computed<Type<unknown> | undefined>(() => {
    const entry = this.registeredWhole();
    if (!entry) {
      return undefined;
    }
    if (isComponentType(entry)) {
      return entry;
    }
    return loadedFieldType(entry) ?? this.loadedRenderers().get(entry);
  });
  protected readonly slot = computed<'template' | 'whole' | 'custom' | 'loading' | 'builtin'>(() => {
    if (this.controlTemplate()) {
      return 'template';
    }
    if (this.wholeRenderer()) {
      return 'whole';
    }
    if (this.customRenderer()) {
      return 'custom';
    }
    return this.registeredWhole() || this.registeredRenderer() ? 'loading' : 'builtin';
  });
  /** What a whole-field renderer receives. */
  protected readonly renderContext = computed<NguFieldRenderContext>(() => {
    const state = this.state();
    const showErrors = this.showErrors();
    return {
      field: this.field(),
      state,
      def: this.def(),
      id: this.id,
      label: this.label(),
      hint: this.hint(),
      placeholder: this.placeholder(),
      prefix: this.prefix(),
      suffix: this.suffix(),
      choices: this.choices(),
      error: showErrors ? this.message() : undefined,
      warning: this.warning(),
      pending: state.pending() ? this.pendingText() : undefined,
      showErrors,
      required: state.required(),
      transform: this.transform(),
      counter: this.counter(),
      i18n: this.i18n,
      look: this.look(),
      touch: () => this.touch(),
    };
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
      choices: this.choices(),
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
        section: this.section,
        focus: () => this.focusControl(),
      });
      inject(DestroyRef).onDestroy(unregister);
    }

    if (isDevMode()) {
      this.checkRenderers();
    }

    // Lazy renderers: load on first use. Server rendering waits for them.
    const pendingTasks = inject(PendingTasks);
    effect(() => {
      const entry = this.registeredWhole() ?? this.registeredRenderer();
      if (!entry || isComponentType(entry) || loadedFieldType(entry) || isClass(entry)) {
        return;
      }
      const done = pendingTasks.add();
      loadFieldType(entry).then(
        (type) => {
          this.loadedRenderers.update((map) => new Map(map).set(entry, type));
          done();
        },
        (error) => {
          done();
          this.errorHandler.handleError(error);
        },
      );
    });

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

  /** Marks the field touched and interacted, as leaving it does. */
  private touch(): void {
    this.interacted.set(true);
    this.state().markAsTouched();
  }

  protected onGesture(): void {
    this.gestureAt = now();
  }

  /** An `nguPrefix`/`nguSuffix` template for this path, else the icon named in the spec. */
  private adornment(side: 'prefix' | 'suffix'): Adornment | undefined {
    const templates = side === 'prefix' ? this.context?.prefixTemplates() : this.context?.suffixTemplates();
    const template = templates?.get(this.path());
    if (template) {
      return { template };
    }
    const d = this.def();
    const component = findIcon(this.icons, side === 'prefix' ? d.prefixIcon : d.suffixIcon);
    return component ? { component } : undefined;
  }

  /**
   * Development builds warn about types without a renderer (NGU-301), unregistered icon names
   * (NGU-302) and registry entries that are neither components nor loaders (NGU-304).
   */
  private checkRenderers(): void {
    effect(() => {
      const d = this.def();
      const entry = this.registeredRenderer();
      const overridden = this.fieldTemplate() || this.controlTemplate() || this.registeredWhole();
      if (!entry && !overridden && !BUILT_IN_TYPES.has(d.type)) {
        nguWarn(
          'NGU-301',
          `no renderer for type "${d.type}" (at "${this.path() || 'a field'}"); it renders as a text input. ${
            PROVIDER_HINTS[d.type] ?? `Register one with provideNguFieldTypes({ '${d.type}': YourComponent }).`
          }`,
          d.type,
        );
      }
      if (entry && !isComponentType(entry) && isClass(entry)) {
        nguWarn('NGU-304', `type "${d.type}" is registered with ${entry.name}, which is not a component.`, d.type);
      }
      for (const side of ['prefix', 'suffix'] as const) {
        const name = side === 'prefix' ? d.prefixIcon : d.suffixIcon;
        const templates = side === 'prefix' ? this.context?.prefixTemplates() : this.context?.suffixTemplates();
        if (name && !findIcon(this.icons, name) && !templates?.has(this.path())) {
          nguWarn('NGU-302', `no icon named "${name}" for ${side}Icon. Register it with provideNguIcons({ '${name}': YourIcon }).`, name);
        }
      }
    });
  }

  /** A click on an icon focuses the control, as a click on the label does. */
  protected focusInput(): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${this.id}`)?.focus();
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
    if (!(target instanceof Element)) {
      return;
    }
    if (isAutofilled(target)) {
      this.autofillBlurred.set(true);
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

/** A class that is not a component: a mistake in the registry, never a loader. */
function isClass(fn: unknown): boolean {
  return typeof fn === 'function' && /^class[\s{]/.test(Function.prototype.toString.call(fn));
}

interface Adornment {
  readonly template?: TemplateRef<NguFieldContext>;
  readonly component?: Type<unknown>;
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
