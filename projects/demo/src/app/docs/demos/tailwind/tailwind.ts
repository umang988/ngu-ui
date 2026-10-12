import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguFormConfig } from 'ngu-form';
import { loadStyles } from '../../../load-styles';

@Component({
  selector: 'demo-tailwind',
  imports: [NguForm],
  providers: [
    // Usually app-wide, in app.config.ts.
    provideNguFormConfig({
      theme: 'none',
      classes: {
        form: 'flex flex-col gap-5',
        field: 'flex flex-col gap-1.5',
        label: 'text-sm font-medium text-slate-900 dark:text-slate-100',
        control:
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs outline-none focus:border-teal-600 focus:ring-3 focus:ring-teal-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
        check: 'size-4 accent-teal-600',
        hint: 'text-sm text-slate-500 dark:text-slate-400',
        error: 'text-sm font-medium text-red-700 dark:text-red-400',
        submit:
          'self-start rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white hover:bg-teal-800',
      },
    }),
  ],
  host: { class: 'tw' },
  template: `<ngu-form [form]="form" submitLabel="Request access" />`,
})
export class TailwindDemo {
  readonly form = defineForm(
    { name: '', email: '', team: 'design', updates: true },
    {
      name: { label: 'Full name', required: true },
      email: { label: 'Work email', type: 'email', required: true, hint: 'We never share it.' },
      team: {
        label: 'Team',
        type: 'select',
        options: [
          { value: 'design', label: 'Design' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'product', label: 'Product' },
        ],
      },
      updates: 'Send me release notes',
    },
  );

  // The docs load Tailwind for this page only; an app imports it in styles.css.
  constructor() {
    loadStyles('tailwind-demo.css');
  }
}
