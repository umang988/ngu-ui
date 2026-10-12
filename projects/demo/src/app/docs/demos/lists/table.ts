import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

interface Line {
  item: string;
  qty: number;
  price: number;
  amount: number;
}

const line = (item = '', qty = 1, price = 0): Line => ({ item, qty, price, amount: 0 });

@Component({
  selector: 'demo-list-table',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ListTableDemo {
  readonly form = defineForm(
    { lines: [line('Notebook', 3, 120), line('Pen set', 1, 249)], total: 0 },
    {
      lines: {
        title: 'Line items',
        layout: 'table',
        reorder: true,
        min: 1,
        addLabel: 'Add line',
        removeLabel: 'Remove',
        newItem: () => line(),
        item: {
          item: { label: 'Item', required: true, span: 3 },
          qty: { label: 'Qty', min: 1, span: 1 },
          price: { label: 'Price', type: 'currency', currency: 'INR', min: 0, span: 2 },
          amount: { label: 'Amount', type: 'currency', currency: 'INR', compute: (_, l) => l.qty * l.price, span: 2 },
        },
      },
      total: { label: 'Total', type: 'currency', currency: 'INR', compute: (m) => m.lines.reduce((sum, l) => sum + l.qty * l.price, 0) },
    },
  );
}
