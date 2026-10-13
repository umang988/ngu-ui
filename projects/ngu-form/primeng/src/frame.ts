import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Message } from 'primeng/message';
import type { NguFieldRenderContext } from 'ngu-form';

/**
 * The label above a PrimeNG control and the message under it: the error as a `p-message`,
 * else the pending text, warning or hint.
 */
@Component({
  selector: 'ngu-prime-frame',
  imports: [Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @if (c.label) {
      @if (group()) {
        <span class="ngu-prime-label ngu-label" [id]="c.id + '-label'">{{ c.label }}@if (c.required) {<span class="ngu-prime-required" aria-hidden="true">*</span>}</span>
      } @else {
        <label class="ngu-prime-label ngu-label" [id]="c.id + '-label'" [for]="c.id">{{ c.label }}@if (c.required) {<span class="ngu-prime-required" aria-hidden="true">*</span>}</label>
      }
    }
    <ng-content />
    @if (c.error) {
      <p-message class="ngu-error" severity="error" variant="simple" size="small" [id]="c.id + '-msg'">{{ c.error }}</p-message>
    } @else if (c.pending) {
      <small class="ngu-prime-hint" [id]="c.id + '-msg'" aria-live="polite">{{ c.pending }}</small>
    } @else if (c.warning) {
      <p-message class="ngu-warning" severity="warn" variant="simple" size="small" [id]="c.id + '-msg'"
        ><span class="ngu-prime-sr-only">{{ c.i18n.message('warningPrefix') }} </span>{{ c.warning }}</p-message
      >
    } @else if (c.hint) {
      <small class="ngu-prime-hint ngu-hint" [id]="c.id + '-msg'">{{ c.hint }}</small>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-inline-size: 0;
    }
    .ngu-prime-label {
      font-weight: 500;
    }
    .ngu-prime-required {
      color: var(--p-red-500, #ef4444);
      margin-inline-start: 0.125rem;
    }
    .ngu-prime-hint {
      color: var(--p-text-muted-color, #64748b);
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
export class NguPrimeFrame {
  /** The field's render context, passed on by the PrimeNG renderer that uses the frame. */
  readonly context = input.required<NguFieldRenderContext>();
  /** The control is a group (radios, checkboxes, segments): its label is not a `<label>`. */
  readonly group = input(false);
}
