import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

export type NguTableIconName =
  | 'search'
  | 'x'
  | 'filter'
  | 'upload'
  | 'download'
  | 'plus'
  | 'eye'
  | 'pencil'
  | 'trash'
  | 'first'
  | 'previous'
  | 'next'
  | 'last'
  | 'asc'
  | 'desc'
  | 'unsorted'
  | 'check'
  | 'mail'
  | 'phone'
  | 'alert'
  | 'inbox';

/** The table's own line icons, drawn on a 16px grid. Decorative: the buttons carry the names. */
@Component({
  selector: 'ngu-tbl-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngu-tbl-icon', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 16 16" [attr.width]="size()" [attr.height]="size()" focusable="false">
      @switch (name()) {
        @case ('search') {
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        }
        @case ('x') {
          <path d="M4 4l8 8M12 4l-8 8" />
        }
        @case ('filter') {
          <path d="M2.5 3h11L9.25 8.25V13l-2.5-1.25v-3.5z" />
        }
        @case ('upload') {
          <path d="M8 10.5v-8M5 5.5l3-3 3 3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
        }
        @case ('download') {
          <path d="M8 2.5v8M5 7.5l3 3 3-3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
        }
        @case ('plus') {
          <path d="M8 3v10M3 8h10" />
        }
        @case ('eye') {
          <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
          <circle cx="8" cy="8" r="2" />
        }
        @case ('pencil') {
          <path d="M10.5 2.5l3 3L6 13H3v-3zM9 4l3 3" />
        }
        @case ('trash') {
          <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4M6.75 6.5V11M9.25 6.5V11" />
        }
        @case ('first') {
          <path d="M8 3.5L3.5 8 8 12.5M12.5 3.5L8 8l4.5 4.5" />
        }
        @case ('previous') {
          <path d="M10 3.5L5.5 8l4.5 4.5" />
        }
        @case ('next') {
          <path d="M6 3.5L10.5 8 6 12.5" />
        }
        @case ('last') {
          <path d="M3.5 3.5L8 8l-4.5 4.5M8 3.5l4.5 4.5L8 12.5" />
        }
        @case ('asc') {
          <path d="M8 13V3M4 7l4-4 4 4" />
        }
        @case ('desc') {
          <path d="M8 3v10M4 9l4 4 4-4" />
        }
        @case ('unsorted') {
          <path d="M5 6l3-3 3 3M5 10l3 3 3-3" />
        }
        @case ('check') {
          <circle cx="8" cy="8" r="6" />
          <path d="M5.5 8.25L7.25 10l3.5-3.5" />
        }
        @case ('mail') {
          <rect x="2" y="3.5" width="12" height="9" rx="1" />
          <path d="M2.5 4.5L8 9l5.5-4.5" />
        }
        @case ('phone') {
          <path
            d="M3.5 2.5h2l1 3-1.5 1a7 7 0 0 0 4.5 4.5l1-1.5 3 1v2a1 1 0 0 1-1 1A10.5 10.5 0 0 1 2.5 3.5a1 1 0 0 1 1-1z"
          />
        }
        @case ('alert') {
          <path d="M8 2l6.5 11.5h-13zM8 6.5v3M8 11.5v.25" />
        }
        @case ('inbox') {
          <path d="M2 9.5l2-6h8l2 6v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zM2 9.5h3.5l1 1.5h3l1-1.5H14" />
        }
      }
    </svg>
  `,
})
export class NguTableIcon {
  readonly name = input.required<NguTableIconName>();
  readonly size = input(16);
}
