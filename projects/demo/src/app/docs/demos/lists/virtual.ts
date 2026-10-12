import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

const SIZES = ['S', 'M', 'L', 'XL'];

@Component({
  selector: 'demo-list-virtual',
  imports: [NguForm],
  template: `
    <ngu-form [form]="form" submitLabel="Save stock" />
    <p class="demo-status">{{ form.value().stock.length }} rows in the model</p>
  `,
})
export class ListVirtualDemo {
  readonly form = defineForm(
    {
      stock: Array.from({ length: 500 }, (_, i) => ({
        sku: i === 417 ? '' : `TS-${String(i + 1).padStart(3, '0')}`,
        size: SIZES[i % 4],
        qty: (i * 7) % 40,
      })),
    },
    {
      stock: {
        title: 'Stock',
        description: 'Row 418 has no SKU. Save to see the list scroll to it.',
        layout: 'table',
        virtual: true,
        newItem: { sku: '', size: 'M', qty: 0 },
        item: {
          sku: { label: 'SKU', required: true },
          size: { label: 'Size', type: 'select', options: SIZES.map((s) => ({ value: s, label: s })) },
          qty: { label: 'Qty', min: 0 },
        },
      },
    },
  );
}
