import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-date-range-strings',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class DateRangeStringsDemo {
  readonly form = defineForm(
    { trip: { from: '2026-11-02', to: '' } },
    {
      // ISO strings in, ISO strings out; bounds apply to both ends.
      trip: { label: 'Trip', type: 'daterange', min: '2026-11-01', max: '2026-12-31' },
    },
  );
}
