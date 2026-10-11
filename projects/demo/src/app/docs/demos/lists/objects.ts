import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-list-objects',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ListObjectsDemo {
  readonly form = defineForm(
    { items: [{ sku: 'A-100', qty: 1 }] },
    {
      items: {
        title: 'Items',
        cols: 2,
        min: 1,
        max: 4,
        addLabel: 'Add item',
        newItem: { sku: '', qty: 1 },
        item: {
          sku: { label: 'SKU', required: true },
          qty: { label: 'Qty', min: 1 },
        },
      },
    },
  );
}
