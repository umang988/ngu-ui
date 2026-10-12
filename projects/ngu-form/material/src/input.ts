import { TextFieldModule } from '@angular/cdk/text-field';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { NguStrength, NguTransform, type NguFieldRenderContext } from 'ngu-form';
import { errorMatcher, NGU_MATERIAL_OPTIONS } from './shared';

/** Types this renderer shows as the native input of the same name. */
const NATIVE = new Set(['text', 'email', 'password', 'number', 'url', 'search', 'tel', 'time', 'datetime-local', 'month', 'week']);

/**
 * Text, number, amount, password and textarea fields as a Material form field, with prefix
 * and suffix text, a character counter, and a show-password button.
 */
@Component({
  selector: 'ngu-mat-input',
  imports: [FormField, NguTransform, NguStrength, TextFieldModule, MatFormField, MatLabel, MatHint, MatError, MatPrefix, MatSuffix, MatInput, MatIconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let d = c.def;
    <mat-form-field [appearance]="options.appearance!" [floatLabel]="options.floatLabel!" [subscriptSizing]="options.subscriptSizing!">
      @if (c.label) {
        <mat-label class="ngu-label">{{ c.label }}</mat-label>
      }
      @if (c.prefix) {
        <span matTextPrefix>{{ c.prefix }}&nbsp;</span>
      }
      @if (d.type === 'textarea') {
        @if (c.transform; as t) {
          <textarea
            matInput
            cdkTextareaAutosize
            [cdkAutosizeMinRows]="d.rows ?? 2"
            [cdkAutosizeMaxRows]="d.maxRows ?? d.rows ?? 2"
            [nguTransform]="t"
            [formField]="c.field"
            [id]="c.id"
            [placeholder]="c.placeholder"
            [attr.autocomplete]="d.autocomplete ?? null"
            [errorStateMatcher]="matcher"
          ></textarea>
        } @else {
          <textarea
            matInput
            cdkTextareaAutosize
            [cdkAutosizeMinRows]="d.rows ?? 2"
            [cdkAutosizeMaxRows]="d.maxRows ?? d.rows ?? 2"
            [formField]="c.field"
            [id]="c.id"
            [placeholder]="c.placeholder"
            [attr.autocomplete]="d.autocomplete ?? null"
            [errorStateMatcher]="matcher"
          ></textarea>
        }
      } @else if (c.transform; as t) {
        <input
          matInput
          type="text"
          [nguTransform]="t"
          [formField]="c.field"
          [id]="c.id"
          [placeholder]="c.placeholder"
          [attr.autocomplete]="d.autocomplete ?? null"
          [attr.inputmode]="inputMode()"
          [attr.enterkeyhint]="d.enterkeyhint ?? null"
          [attr.dir]="d.mask ? 'ltr' : null"
          [errorStateMatcher]="matcher"
        />
      } @else {
        <input
          matInput
          [type]="inputType()"
          [formField]="c.field"
          [id]="c.id"
          [placeholder]="c.placeholder"
          [attr.step]="d.step ?? null"
          [attr.autocomplete]="d.autocomplete ?? null"
          [attr.inputmode]="inputMode()"
          [attr.enterkeyhint]="d.enterkeyhint ?? (d.type === 'search' ? 'search' : null)"
          [errorStateMatcher]="matcher"
        />
      }
      @if (c.suffix) {
        <span matTextSuffix>{{ c.suffix }}</span>
      }
      @if (revealable()) {
        <button
          matIconButton
          matSuffix
          type="button"
          [attr.aria-controls]="c.id"
          [attr.aria-label]="revealed() ? c.i18n.message('hidePasswordLabel') : c.i18n.message('showPasswordLabel')"
          [attr.aria-pressed]="revealed()"
          (click)="revealed.set(!revealed())"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
            @if (revealed()) {
              <path d="M12 6.5c3.8 0 7.2 2.1 8.8 5.5-.6 1.3-1.5 2.4-2.6 3.3l1.4 1.4c1.6-1.4 2.8-3 3.4-4.7C21.3 7.6 17 4.5 12 4.5c-1.3 0-2.5.2-3.7.6l1.6 1.6c.7-.1 1.4-.2 2.1-.2zM2.7 3.3 1.3 4.7l2.7 2.7C2.4 8.6 1.3 10.2.9 12c1.7 4.4 6 7.5 11 7.5 1.6 0 3.1-.3 4.4-.9l3 3 1.4-1.4L2.7 3.3zm7.4 7.4 3.2 3.2c-.4.2-.8.3-1.3.3-1.5 0-2.7-1.2-2.7-2.7 0-.3 0-.6.1-.8zM12 17.5c-3.8 0-7.2-2.1-8.8-5.5.6-1.3 1.6-2.4 2.8-3.3l1.8 1.8c-.2.5-.3 1-.3 1.5 0 2.6 2.1 4.7 4.7 4.7.5 0 1-.1 1.5-.3l1 1c-.9.1-1.8.1-2.7.1z" />
            } @else {
              <path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z" />
            }
          </svg>
        </button>
      }
      @if (c.error) {
        <mat-error class="ngu-error">{{ c.error }}</mat-error>
      } @else if (c.pending) {
        <mat-hint class="ngu-hint">{{ c.pending }}</mat-hint>
      } @else if (c.warning) {
        <mat-hint class="ngu-mat-warning ngu-warning"><span class="ngu-mat-sr-only">{{ c.i18n.message('warningPrefix') }} </span>{{ c.warning }}</mat-hint>
      } @else if (c.hint) {
        <mat-hint class="ngu-hint">{{ c.hint }}</mat-hint>
      }
      @if (c.counter; as k) {
        <mat-hint align="end" aria-hidden="true">{{ k.length }} / {{ k.max }}</mat-hint>
      }
    </mat-form-field>
    @if (c.counter; as k) {
      <span class="ngu-mat-sr-only" aria-live="polite">{{ k.text }}</span>
    }
    @if (strength(); as s) {
      <ngu-strength [value]="s.value" [options]="s.options" [minLength]="s.minLength" [textId]="c.id + '-strength'" />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    mat-form-field {
      inline-size: 100%;
    }
    .ngu-mat-warning {
      color: var(--ngu-warning-color, #8a5300);
    }
    .ngu-mat-sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }
  `,
})
export class NguMatInput {
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly options = inject(NGU_MATERIAL_OPTIONS);
  protected readonly matcher = errorMatcher(this.context);

  protected readonly revealable = computed(() => this.context().def.type === 'password' && this.context().def.reveal !== false);
  /** Hidden again after a reset. */
  protected readonly revealed = linkedSignal({ source: () => this.context().def, computation: () => false });
  protected readonly inputType = computed(() => {
    const type = this.context().def.type;
    if (type === 'password') {
      return this.revealed() ? 'text' : 'password';
    }
    return NATIVE.has(type) ? type : 'text';
  });
  protected readonly inputMode = computed(() => {
    const d = this.context().def;
    if (d.inputmode) {
      return d.inputmode;
    }
    if (d.type === 'email') {
      return 'email';
    }
    if ((d.type === 'number' || d.type === 'currency') && typeof d.min === 'number' && d.min >= 0) {
      return 'decimal';
    }
    return null;
  });
  protected readonly strength = computed(() => {
    const c = this.context();
    const strength = c.def.type === 'password' ? c.def.strength : undefined;
    if (!strength) {
      return undefined;
    }
    const value = c.state.value();
    return {
      value: typeof value === 'string' ? value : '',
      options: strength === true ? {} : strength,
      minLength: c.def.minLength ?? 8,
    };
  });
}
