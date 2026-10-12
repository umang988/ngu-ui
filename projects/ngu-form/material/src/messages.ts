import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { NguFieldRenderContext } from 'ngu-form';

/** Error, pending text, warning or hint under a control that is not in a `mat-form-field`. */
@Component({
  selector: 'ngu-mat-subscript',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @let c = context();
    @if (c.error) {
      <p class="ngu-mat-subscript ngu-mat-subscript--error ngu-error" [id]="c.id + '-msg'">{{ c.error }}</p>
    } @else if (c.pending) {
      <p class="ngu-mat-subscript" [id]="c.id + '-msg'" aria-live="polite">{{ c.pending }}</p>
    } @else if (c.warning) {
      <p class="ngu-mat-subscript ngu-mat-subscript--warning ngu-warning" [id]="c.id + '-msg'">
        <span class="ngu-mat-sr-only">{{ c.i18n.message('warningPrefix') }} </span>{{ c.warning }}
      </p>
    } @else if (c.hint) {
      <p class="ngu-mat-subscript ngu-hint" [id]="c.id + '-msg'">{{ c.hint }}</p>
    }
  `,
  styles: `
    .ngu-mat-subscript {
      margin: 0;
      padding-inline: 1rem;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .ngu-mat-subscript--error {
      color: var(--mat-sys-error);
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
export class NguMatSubscript {
  readonly context = input.required<NguFieldRenderContext>();
}

/** Id of the message under a control, for `aria-describedby`, or null when there is none. */
export function subscriptId(c: NguFieldRenderContext): string | null {
  return c.error || c.pending || c.warning || c.hint ? `${c.id}-msg` : null;
}
