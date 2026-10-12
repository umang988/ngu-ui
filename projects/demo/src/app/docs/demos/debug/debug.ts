import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { NguFormDebug } from 'ngu-form/debug';

@Component({
  selector: 'demo-debug',
  imports: [NguForm, NguFormDebug],
  template: `
    <ngu-form [form]="form" submitLabel="Save" />
    <!-- Development only: import it from ngu-form/debug and leave it out of production. -->
    <ngu-form-debug [form]="form" />
  `,
})
export class DebugDemo {
  readonly form = defineForm(
    { name: 'Ada', email: '', items: [{ sku: 'A-1', qty: 1 }] },
    {
      name: { label: 'Name', required: true },
      email: { label: 'Email', type: 'email', required: true },
      items: {
        title: 'Items',
        item: { sku: { label: 'SKU', required: true }, qty: { label: 'Qty', min: 1 } },
        newItem: { sku: '', qty: 1 },
        cols: 2,
      },
    },
  );
}
