import { Component } from '@angular/core';
import { defineForm, NguForm, NguSuffixTemplate, provideNguIcons } from 'ngu-form';

// Icons are components. Draw them at 1em in currentColor and they fit every field size.
@Component({
  selector: 'demo-search-icon',
  template: `<svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>`,
})
class SearchIcon {}

@Component({
  selector: 'demo-mail-icon',
  template: `<svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>`,
})
class MailIcon {}

@Component({
  selector: 'demo-icons',
  imports: [NguForm, NguSuffixTemplate],
  // Usually app-wide, in app.config.ts.
  providers: [provideNguIcons({ search: SearchIcon, mail: MailIcon })],
  template: `
    <ngu-form [form]="form">
      <!-- A template for one path: here a live count while typing. -->
      <ng-template nguSuffix="handle" let-state="state">
        <small>{{ state.value().length }}/15</small>
      </ng-template>
    </ngu-form>
  `,
})
export class IconsDemo {
  readonly form = defineForm(
    { query: '', email: '', handle: '' },
    {
      query: {
        label: 'Search',
        type: 'search',
        prefixIcon: 'search',
        placeholder: 'Orders, people, files',
      },
      email: { label: 'Email', type: 'email', suffixIcon: 'mail' },
      handle: { label: 'Handle', prefix: '@', maxLength: 15, counter: false },
    },
  );
}
