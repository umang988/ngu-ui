import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { defineForm, NguForm } from 'ngu-form';
import { PRICES, PRODUCTS } from '../api/catalog';

interface Address {
  city: string;
  zip: string;
}

interface Order {
  customer: string;
  priority: number;
  items: { product: string; qty: number; price: number; amount: number; gift: boolean; note: string }[];
  phones: string[];
  billing: Address;
  sameAsBilling: boolean;
  shipping: Address;
  discount: number;
  total: number;
}

const newItem = () => ({ product: '', qty: 1, price: 0, amount: 0, gift: false, note: '' });

@Component({
  selector: 'app-order',
  imports: [NguForm, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngu-form [form]="order" submitLabel="Place order" (submitted)="placed.set($event)" />
    @if (placed(); as value) {
      <pre class="demo-result">{{ value | json }}</pre>
    }
  `,
})
export class OrderForm {
  protected readonly placed = signal<Order | undefined>(undefined);

  protected readonly order = defineForm<Order>(
    {
      customer: '',
      priority: 3,
      items: [newItem()],
      phones: [],
      billing: { city: '', zip: '' },
      sameAsBilling: false,
      shipping: { city: '', zip: '' },
      discount: 0,
      total: 0,
    },
    {
      customer: { label: 'Customer', required: true, autocomplete: 'name' },
      priority: { label: 'Priority', type: 'rating', required: true },
      items: {
        title: 'Items',
        span: 2,
        description: 'At least one item, up to five.',
        cols: { base: 2, md: 4 },
        min: 1,
        max: 5,
        addLabel: 'Add item',
        newItem,
        validate: (items) => {
          const products = items.map((i) => i.product).filter(Boolean);
          return new Set(products).size === products.length ? undefined : 'Each product can appear only once';
        },
        item: {
          product: {
            label: 'Product',
            type: 'select',
            placeholder: 'Choose…',
            required: true,
            options: PRODUCTS,
            // Look up the unit price for this row when the user picks a product.
            onChange: (product, { patchItem }) => patchItem({ price: PRICES[product] ?? 0 }),
          },
          qty: { label: 'Qty', min: 1, max: 99, suffix: 'pcs' },
          price: { label: 'Unit price', prefix: '₹', min: 0, step: 0.01 },
          amount: { label: 'Amount', prefix: '₹', compute: (_, item) => round(item.qty * item.price) },
          gift: 'Gift wrap',
          note: {
            label: 'Gift note',
            type: 'textarea',
            rows: 1,
            maxRows: 4,
            maxLength: 120,
            span: 3,
            hidden: (_, item) => !item.gift,
          },
        },
      },
      phones: {
        title: 'Phone numbers',
        span: 2,
        addLabel: 'Add phone',
        newItem: '',
        item: { label: 'Phone', type: 'text', pattern: /^\+?[\d\s-]{7,}$/, placeholder: '+91 98765 43210', inputmode: 'tel' },
      },
      $delivery: { text: 'We deliver in 3 to 5 working days.' },
      billing: {
        title: 'Billing address',
        span: 2,
        cols: { base: 1, sm: 2 },
        fields: {
          city: { label: 'City', required: true, autocomplete: 'billing address-level2' },
          zip: { label: 'PIN code', required: true, pattern: /^\d{6}$/, inputmode: 'numeric', autocomplete: 'billing postal-code' },
        },
      },
      sameAsBilling: {
        label: 'Ship to the billing address',
        span: 2,
        // Runs once per click; the copy it writes does not trigger anything else.
        onChange: (same, { model, patch }) => {
          if (same) {
            patch({ shipping: { ...model.billing } });
          }
        },
      },
      shipping: {
        title: 'Shipping address',
        span: 2,
        cols: { base: 1, sm: 2 },
        fields: {
          city: { label: 'City', required: true, autocomplete: 'shipping address-level2' },
          zip: { label: 'PIN code', required: true, pattern: /^\d{6}$/, inputmode: 'numeric', autocomplete: 'shipping postal-code' },
        },
      },
      $totals: { divider: true },
      discount: { label: 'Discount', prefix: '₹', min: 0, step: 0.01 },
      total: {
        label: 'Total',
        prefix: '₹',
        hint: 'Items minus discount',
        compute: (m) => round(m.items.reduce((sum, i) => sum + i.qty * i.price, 0) - m.discount),
      },
    },
    { cols: { base: 1, sm: 2 } },
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
