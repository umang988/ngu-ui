import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-date-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class DateBasicDemo {
  readonly form = defineForm(
    { birthday: '' },
    {
      // An ISO date string, '' while empty.
      birthday: { label: 'Birthday', type: 'date', max: '2010-12-31' },
    },
  );
}
