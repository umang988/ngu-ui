import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-radio-segmented',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class RadioSegmentedDemo {
  readonly form = defineForm(
    { view: 'list', period: 'month' },
    {
      view: {
        label: 'Show as',
        type: 'segmented',
        options: [
          { value: 'list', label: 'List' },
          { value: 'grid', label: 'Grid' },
          { value: 'map', label: 'Map' },
        ],
      },
      period: {
        label: 'Billing',
        type: 'segmented',
        options: [
          { value: 'month', label: 'Monthly' },
          { value: 'year', label: 'Yearly' },
        ],
      },
    },
  );
}
