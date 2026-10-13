import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguFormConfig } from 'ngu-form';
import { nguTailwind } from 'ngu-form/tailwind';
import { loadStyles } from '../../../load-styles';

@Component({
  selector: 'demo-tailwind-preset',
  imports: [NguForm],
  providers: [
    // Usually app-wide, in app.config.ts. Your CSS imports "ngu-form/tailwind.css".
    provideNguFormConfig({ theme: 'none', classes: nguTailwind }),
  ],
  host: { class: 'tw' },
  template: `<ngu-form [form]="form" submitLabel="Create project" />`,
})
export class TailwindPresetDemo {
  readonly form = defineForm(
    {
      name: '',
      site: '',
      budget: 0,
      visibility: 'team',
      labels: [] as string[],
      summary: '',
      notify: true,
    },
    {
      $intro: { text: 'Projects group your forms, their drafts and their submissions.' },
      name: { label: 'Project name', required: true, hint: 'Shown to everyone on the team.' },
      site: { label: 'Website', type: 'url', prefix: 'https://', placeholder: 'example.com' },
      budget: { label: 'Monthly budget', prefix: '$', suffix: 'USD', min: 0 },
      visibility: {
        label: 'Visibility',
        type: 'radio',
        options: [
          { value: 'team', label: 'Team only' },
          { value: 'org', label: 'Whole organization' },
          { value: 'public', label: 'Public link' },
        ],
      },
      labels: { label: 'Labels', type: 'tags', placeholder: 'Type and press Enter' },
      summary: { label: 'Summary', type: 'textarea', rows: 3, maxLength: 160, counter: true },
      notify: 'Email me when someone submits',
    },
  );

  // The docs load Tailwind for this page only; an app imports it in styles.css.
  constructor() {
    loadStyles('tailwind-demo.css');
  }
}
