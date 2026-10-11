import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-date-range-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Search rooms" />`,
})
export class DateRangeBasicDemo {
  readonly form = defineForm(
    { stay: { from: null as Date | null, to: null as Date | null } },
    {
      stay: {
        label: 'Stay',
        type: 'daterange',
        required: true,
        fromLabel: 'Check in',
        toLabel: 'Check out',
      },
    },
  );
}
