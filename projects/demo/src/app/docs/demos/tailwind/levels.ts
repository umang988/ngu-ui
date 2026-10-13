import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguFormConfig } from 'ngu-form';
import { nguTailwind } from 'ngu-form/tailwind';
import { loadStyles } from '../../../load-styles';

@Component({
  selector: 'demo-tailwind-levels',
  imports: [NguForm],
  providers: [provideNguFormConfig({ theme: 'none', classes: nguTailwind })],
  host: { class: 'tw' },
  // A form adds to the app-wide classes, slot by slot.
  template: `<ngu-form [form]="form" submitLabel="Redeem" [classes]="{ submit: 'w-full' }" />`,
})
export class TailwindLevelsDemo {
  readonly form = defineForm(
    { code: '', billing: { company: '', vat: '' } },
    {
      // A field: `class` goes on its host, `classes` on the slots inside it.
      code: {
        label: 'Coupon code',
        required: true,
        class: 'rounded-xl bg-amber-50 p-4 dark:bg-amber-400/10',
        classes: { control: 'font-mono uppercase tracking-widest' },
      },
      // A group: its classes reach every field inside it.
      billing: {
        title: 'Billing details',
        cols: 2,
        class: 'rounded-xl border border-dashed border-zinc-300 p-4 dark:border-white/20',
        classes: { label: 'text-zinc-600 dark:text-zinc-300', control: 'bg-zinc-50 dark:bg-white/10' },
        fields: { company: 'Company', vat: { label: 'VAT number', hint: 'Optional' } },
      },
    },
  );

  constructor() {
    loadStyles('tailwind-demo.css');
  }
}
