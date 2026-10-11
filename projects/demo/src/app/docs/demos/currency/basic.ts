import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-currency-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class CurrencyBasicDemo {
  readonly form = defineForm(
    { salary: 1250000, fee: 49.9 },
    {
      salary: { label: 'Salary', type: 'currency', currency: 'INR', min: 0 },
      fee: { label: 'Fee', type: 'currency', currency: 'EUR', min: 0 },
    },
  );
}
