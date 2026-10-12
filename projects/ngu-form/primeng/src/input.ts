import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NguBind, NguStrength, type NguFieldRenderContext } from 'ngu-form';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { InputMask } from 'primeng/inputmask';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Textarea } from 'primeng/textarea';
import { messageId, NguPrimeFrame } from './frame';

const NATIVE = new Set(['text', 'email', 'url', 'search', 'tel', 'time', 'datetime-local', 'month', 'week']);

/**
 * Text, email, URL, search, phone-number text, time, password and textarea fields with
 * PrimeNG's `pInputText`, `p-password`, `pTextarea` and `p-inputmask`, with prefix and suffix
 * text as input group add-ons.
 */
@Component({
  selector: 'ngu-prime-input',
  imports: [NgTemplateOutlet, NguBind, NguStrength, NguPrimeFrame, InputText, InputGroup, InputGroupAddon, InputMask, Password, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let d = c.def;
    <ngu-prime-frame [context]="c">
      @switch (kind()) {
        @case ('password') {
          <p-password
            [nguBind]="c.field"
            [inputId]="c.id"
            [placeholder]="c.placeholder"
            [toggleMask]="d.reveal !== false"
            [feedback]="false"
            [invalid]="c.showErrors"
            [required]="c.required"
            [autocomplete]="d.autocomplete ?? 'current-password'"
            [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
            [fluid]="true"
          />
        }
        @case ('textarea') {
          <textarea
            pTextarea
            [nguBind]="c.field"
            [nguBindParse]="parse()"
            [nguBindFormat]="format()"
            [autoResize]="!!d.maxRows"
            [attr.rows]="d.rows ?? 3"
            [id]="c.id"
            [placeholder]="c.placeholder"
            [invalid]="c.showErrors"
            [required]="c.required"
            [attr.aria-describedby]="describedBy()"
            [attr.aria-invalid]="c.showErrors || null"
            [fluid]="true"
          ></textarea>
        }
        @case ('mask') {
          <p-inputmask
            [nguBind]="c.field"
            [mask]="mask()"
            [unmask]="true"
            [autoClear]="false"
            [inputId]="c.id"
            [placeholder]="c.placeholder"
            [invalid]="c.showErrors"
            [required]="c.required"
            [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
            [fluid]="true"
          />
        }
        @default {
          @if (c.prefix || c.suffix) {
            <p-inputgroup>
              @if (c.prefix) {
                <p-inputgroup-addon>{{ c.prefix }}</p-inputgroup-addon>
              }
              <ng-container *ngTemplateOutlet="text" />
              @if (c.suffix) {
                <p-inputgroup-addon>{{ c.suffix }}</p-inputgroup-addon>
              }
            </p-inputgroup>
          } @else {
            <ng-container *ngTemplateOutlet="text" />
          }
        }
      }
      @if (c.counter; as k) {
        <small class="ngu-prime-counter" aria-hidden="true">{{ k.length }} / {{ k.max }}</small>
        <span class="ngu-prime-sr-only" aria-live="polite">{{ k.text }}</span>
      }
      @if (strength(); as s) {
        <ngu-strength [value]="s.value" [options]="s.options" [minLength]="s.minLength" [textId]="c.id + '-strength'" />
      }
    </ngu-prime-frame>

    <ng-template #text>
      <input
        pInputText
        [nguBind]="c.field"
        [nguBindParse]="parse()"
        [nguBindFormat]="format()"
        [type]="inputType()"
        [id]="c.id"
        [placeholder]="c.placeholder"
        [invalid]="c.showErrors"
        [attr.required]="c.required || null"
        [attr.autocomplete]="d.autocomplete ?? null"
        [attr.inputmode]="d.inputmode ?? (d.type === 'email' ? 'email' : null)"
        [attr.enterkeyhint]="d.enterkeyhint ?? (d.type === 'search' ? 'search' : null)"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="c.showErrors || null"
        [fluid]="true"
      />
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
    .ngu-prime-counter {
      align-self: flex-end;
      color: var(--p-text-muted-color, #64748b);
      font-variant-numeric: tabular-nums;
    }
    .ngu-prime-sr-only {
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
export class NguPrimeInput {
  readonly context = input.required<NguFieldRenderContext>();

  protected readonly kind = computed(() => {
    const d = this.context().def;
    if (d.type === 'password') {
      return 'password';
    }
    if (d.type === 'textarea') {
      return 'textarea';
    }
    return d.mask ? 'mask' : 'text';
  });
  protected readonly inputType = computed(() => {
    const type = this.context().def.type;
    return NATIVE.has(type) ? type : 'text';
  });
  protected readonly describedBy = computed(() => messageId(this.context()));
  /** ngu-form masks use `0` for a digit; PrimeNG uses `9`. */
  protected readonly mask = computed(() => (this.context().def.mask ?? '').replace(/0/g, '9'));

  /** Custom `parse`, with unreadable text leaving the last good value. */
  protected readonly parse = computed(() => {
    const t = this.context().transform;
    if (!t) {
      return (text: string) => text;
    }
    return (text: string) => {
      try {
        return t.parse(text);
      } catch {
        return this.context().state.value();
      }
    };
  });
  protected readonly format = computed(() => {
    const t = this.context().transform;
    return t ? (value: unknown) => t.format(value) : (value: unknown) => value;
  });
  protected readonly strength = computed(() => {
    const c = this.context();
    const strength = c.def.type === 'password' ? c.def.strength : undefined;
    if (!strength) {
      return undefined;
    }
    const value = c.state.value();
    return { value: typeof value === 'string' ? value : '', options: strength === true ? {} : strength, minLength: c.def.minLength ?? 8 };
  });
}
