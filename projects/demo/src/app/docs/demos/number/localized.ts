import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-number-localized',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class NumberLocalizedDemo {
  readonly form = defineForm(
    { population: 1420000000, share: 0.175 },
    {
      // Shown with the locale's separators; the model holds a plain number.
      population: { label: 'Population', localized: true },
      share: { label: 'Share', localized: { style: 'percent', maximumFractionDigits: 1 } },
    },
  );
}
