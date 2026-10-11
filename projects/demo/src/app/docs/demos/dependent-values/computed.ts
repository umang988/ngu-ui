import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-computed',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ComputedDemo {
  readonly form = defineForm(
    { qty: 2, price: 450, total: 0 },
    {
      qty: { label: 'Quantity', min: 1 },
      price: { label: 'Unit price', prefix: '₹', min: 0 },
      // Read-only, and updated whenever what it reads changes.
      total: { label: 'Total', prefix: '₹', compute: (m) => m.qty * m.price },
    },
    { cols: 3 },
  );
}
