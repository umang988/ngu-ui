import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NguBind, type NguFieldRenderContext } from 'ngu-form';
import { Checkbox } from 'primeng/checkbox';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { messageId, NguPrimeFrame } from './frame';

/**
 * Checkboxes, checkbox groups, switches and consent boxes with `p-checkbox` and
 * `p-toggleswitch`. A consent box stores the time it was ticked.
 */
@Component({
  selector: 'ngu-prime-check',
  imports: [NguBind, NguPrimeFrame, Checkbox, ToggleSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let d = c.def;
    @if (kind() === 'group') {
      <ngu-prime-frame [context]="c" [group]="true">
        <div class="ngu-prime-options" role="group" [attr.aria-labelledby]="c.label ? c.id + '-label' : null" [attr.aria-describedby]="describedBy()">
          @for (o of c.choices; track $index) {
            <span class="ngu-prime-option">
              <p-checkbox
                [nguBind]="c.field"
                [value]="o.value"
                [inputId]="$index === 0 ? c.id : c.id + '-' + $index"
                [invalid]="c.showErrors"
                [disabled]="o.disabled ?? false"
              />
              <label [for]="$index === 0 ? c.id : c.id + '-' + $index">{{ o.label }}</label>
            </span>
          }
        </div>
      </ngu-prime-frame>
    } @else {
      <ngu-prime-frame [context]="noLabel()">
        <span class="ngu-prime-option">
          @if (kind() === 'switch') {
            <p-toggleswitch [nguBind]="c.field" [inputId]="c.id" [invalid]="c.showErrors" [ariaLabelledBy]="c.id + '-text'" />
          } @else if (kind() === 'consent') {
            <p-checkbox
              [nguBind]="c.field"
              [nguBindFormat]="isGiven"
              [nguBindParse]="consent"
              [binary]="true"
              [inputId]="c.id"
              [invalid]="c.showErrors"
              [required]="c.required"
            />
          } @else {
            <p-checkbox [nguBind]="c.field" [binary]="true" [inputId]="c.id" [invalid]="c.showErrors" />
          }
          <label class="ngu-check__text" [id]="c.id + '-text'" [for]="c.id">{{ c.label }}@if (c.required && kind() !== 'single') {<span class="ngu-prime-required" aria-hidden="true">*</span>}</label>
          @if (kind() === 'consent' && d.policy; as policy) {
            <a class="ngu-prime-policy" [href]="policy.href" target="_blank" rel="noopener"
              >{{ c.i18n.text(policy.label) }}<span class="ngu-prime-sr-only"> ({{ c.i18n.message('opensInNewTab') }})</span></a
            >
          }
        </span>
      </ngu-prime-frame>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .ngu-prime-options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
    }
    .ngu-prime-option {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .ngu-prime-required {
      color: var(--p-red-500, #ef4444);
      margin-inline-start: 0.125rem;
    }
    .ngu-prime-policy {
      color: var(--p-primary-color);
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
export class NguPrimeCheck {
  readonly context = input.required<NguFieldRenderContext>();

  protected readonly kind = computed(() => {
    const d = this.context().def;
    if (d.type === 'switch' || d.type === 'consent') {
      return d.type;
    }
    return d.multiple ? 'group' : 'single';
  });
  protected readonly describedBy = computed(() => messageId(this.context()));
  /** The label sits next to the box, so the frame shows only the messages. */
  protected readonly noLabel = computed(() => ({ ...this.context(), label: undefined }));
  protected readonly isGiven = (value: unknown) => value != null;
  protected readonly consent = (checked: boolean) => (checked ? new Date() : null);
}
