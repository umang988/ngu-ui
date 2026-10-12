import { Component } from '@angular/core';
import { defineForm, NguForm, type DynamicField } from 'ngu-form';

// Per-product attributes, as an API would send them.
const ATTRIBUTES: DynamicField[] = [
  { key: 'color', type: 'select', label: 'Color', required: true, options: [{ value: 'red', label: 'Red' }, { value: 'navy', label: 'Navy' }] },
  { key: 'engraving', label: 'Engraving', maxLength: 20 },
];

@Component({
  selector: 'demo-list-runtime',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ListRuntimeDemo {
  readonly form = defineForm(
    { items: [{ product: 'Bottle', options: {} as Record<string, string> }] },
    {
      items: {
        title: 'Items',
        addLabel: 'Add item',
        newItem: () => ({ product: '', options: {} }),
        item: {
          product: { label: 'Product', required: true },
          options: { title: 'Options', cols: { base: 1, sm: 2 }, fields: ATTRIBUTES },
        },
      },
    },
  );
}
