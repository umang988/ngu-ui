import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type { Choice, NguFieldRenderContext } from 'ngu-form';
import { NguMatSubscript, subscriptId } from './messages';
import { SUBSCRIPT_STYLES } from './shared';

/**
 * Checkboxes, checkbox groups, switches and consent boxes as `mat-checkbox` and
 * `mat-slide-toggle`. A consent box stores the time it was ticked.
 */
@Component({
  selector: 'ngu-mat-check',
  imports: [FormField, MatCheckbox, MatSlideToggle, NguMatSubscript],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let d = c.def;
    @switch (kind()) {
      @case ('switch') {
        <mat-slide-toggle [formField]="c.field" [id]="c.id" [aria-describedby]="describedBy()!">
          <span class="ngu-check__text">{{ c.label }}</span>@if (c.required) {<span aria-hidden="true"> *</span>}
        </mat-slide-toggle>
      }
      @case ('consent') {
        <span class="ngu-mat-row">
          <mat-checkbox
            [id]="c.id"
            [checked]="c.state.value() != null"
            [disabled]="c.state.disabled() || c.state.readonly()"
            [required]="c.required"
            [aria-describedby]="describedBy()!"
            (change)="setConsent($event.checked)"
          >
            <span class="ngu-check__text">{{ c.label }}</span>
          </mat-checkbox>
          @if (d.policy; as policy) {
            <a class="ngu-mat-policy" [href]="policy.href" target="_blank" rel="noopener"
              >{{ c.i18n.text(policy.label) }}<span class="ngu-mat-sr-only"> ({{ c.i18n.message('opensInNewTab') }})</span></a
            >
          }
        </span>
      }
      @case ('group') {
        <fieldset class="ngu-mat-group" [attr.aria-describedby]="describedBy()">
          @if (c.label) {
            <legend class="ngu-mat-legend ngu-label">{{ c.label }}@if (c.required) {<span aria-hidden="true"> *</span>}</legend>
          }
          @for (o of c.choices; track $index) {
            <mat-checkbox
              [id]="$index === 0 ? c.id : c.id + '-' + $index"
              [checked]="isChecked(o)"
              [disabled]="c.state.disabled() || c.state.readonly() || (o.disabled ?? false)"
              (change)="toggle(o, $event.checked)"
              >{{ o.label }}</mat-checkbox
            >
          }
        </fieldset>
      }
      @default {
        <mat-checkbox [formField]="c.field" [id]="c.id" [aria-describedby]="describedBy()!"><span class="ngu-check__text">{{ c.label }}</span></mat-checkbox>
      }
    }
    <ngu-mat-subscript [context]="c" />
  `,
  styles: `
    ${SUBSCRIPT_STYLES}
    .ngu-mat-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0 1rem;
    }
    .ngu-mat-legend {
      inline-size: 100%;
    }
    .ngu-mat-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 0.5rem;
    }
    .ngu-mat-policy {
      color: var(--mat-sys-primary);
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
export class NguMatCheck {
  readonly context = input.required<NguFieldRenderContext>();

  protected readonly kind = computed(() => {
    const d = this.context().def;
    if (d.type === 'switch' || d.type === 'consent') {
      return d.type;
    }
    return d.multiple ? 'group' : 'single';
  });
  protected readonly describedBy = computed(() => subscriptId(this.context()));

  protected isChecked(choice: Choice<unknown>): boolean {
    const value = this.context().state.value();
    return Array.isArray(value) && value.some((v) => Object.is(v, choice.value));
  }

  /** Keeps the option order of the list, whatever order boxes are ticked in. */
  protected toggle(choice: Choice<unknown>, checked: boolean): void {
    const c = this.context();
    const current = (c.state.value() as readonly unknown[]) ?? [];
    const next = checked
      ? c.choices.filter((o) => Object.is(o.value, choice.value) || current.some((v) => Object.is(v, o.value))).map((o) => o.value)
      : current.filter((v) => !Object.is(v, choice.value));
    c.state.value.set(next);
    c.state.markAsDirty();
    c.touch();
  }

  protected setConsent(checked: boolean): void {
    const c = this.context();
    c.state.value.set(checked ? new Date() : null);
    c.state.markAsDirty();
    c.touch();
  }
}
