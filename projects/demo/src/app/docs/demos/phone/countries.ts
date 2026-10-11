import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-phone-countries',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class PhoneCountriesDemo {
  readonly form = defineForm(
    { work: '+14155552671' },
    {
      work: {
        label: 'Work phone',
        type: 'phone',
        countries: ['US', 'CA', 'GB', 'IN'],
        required: true,
      },
    },
  );
}
