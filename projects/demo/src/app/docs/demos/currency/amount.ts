import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-currency-amount',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class CurrencyAmountDemo {
  readonly form = defineForm(
    { amount: 0 },
    {
      // Without a currency: an amount with two decimals.
      amount: { label: 'Amount', type: 'currency', min: 0, suffix: 'credits' },
    },
  );
}
