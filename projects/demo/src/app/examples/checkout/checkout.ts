import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { defineForm, NguForm } from 'ngu-form';
import { PRICES, PRODUCTS } from '../api/catalog';

interface Line {
  product: string;
  qty: number;
  price: number;
  amount: number;
}

interface Checkout {
  cart: { items: Line[]; subtotal: number };
  delivery: { method: 'ship' | 'pickup'; store: string; slot: string };
  address: { name: string; line1: string; city: string; pin: string; phone: string };
  payment: { method: 'card' | 'upi' | 'cod'; card: string; expiry: string; upi: string; terms: Date | null };
}

const line = (product = '', qty = 1): Line => ({ product, qty, price: PRICES[product] ?? 0, amount: 0 });
const round = (value: number) => Math.round(value * 100) / 100;

const STORES = [
  { value: 'surat', label: 'Surat, Ghod Dod Road' },
  { value: 'ahmedabad', label: 'Ahmedabad, CG Road' },
];

@Component({
  selector: 'app-checkout',
  imports: [NguForm, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngu-form [form]="checkout" submitLabel="Place order" (submitted)="placed.set($event)" />
    @if (placed(); as value) {
      <pre class="demo-result">{{ value | json }}</pre>
    }
  `,
})
export class CheckoutForm {
  protected readonly placed = signal<Checkout | undefined>(undefined);

  protected readonly checkout = defineForm<Checkout>(
    {
      cart: { items: [line('tea', 2), line('honey')], subtotal: 0 },
      delivery: { method: 'ship', store: '', slot: 'morning' },
      address: { name: '', line1: '', city: '', pin: '', phone: '' },
      payment: { method: 'upi', card: '', expiry: '', upi: '', terms: null },
    },
    {
      cart: {
        title: 'Cart',
        fields: {
          items: {
            title: 'Items',
            layout: 'table',
            reorder: true,
            min: 1,
            max: 6,
            addLabel: 'Add item',
            newItem: () => line(),
            validate: (items) => {
              const chosen = items.map((i) => i.product).filter(Boolean);
              return new Set(chosen).size === chosen.length ? undefined : 'Each product can appear only once';
            },
            item: {
              product: {
                label: 'Product',
                type: 'select',
                placeholder: 'Choose…',
                required: true,
                options: PRODUCTS,
                span: 3,
                // Fill this row's unit price when the user picks a product.
                onChange: (product, { patchItem }) => patchItem({ price: PRICES[product] ?? 0 }),
              },
              qty: { label: 'Qty', min: 1, max: 20, span: 1 },
              price: { label: 'Price', type: 'currency', currency: 'INR', readonly: true, span: 2 },
              amount: { label: 'Amount', type: 'currency', currency: 'INR', compute: (_, l) => round(l.qty * l.price), span: 2 },
            },
          },
          subtotal: {
            label: 'Subtotal',
            type: 'currency',
            currency: 'INR',
            compute: (m) => round(m.cart.items.reduce((sum, l) => sum + l.qty * l.price, 0)),
          },
        },
      },
      delivery: {
        title: 'Delivery',
        fields: {
          method: {
            label: 'How should it reach you?',
            type: 'radio',
            options: [
              { value: 'ship', label: 'Deliver to my address' },
              { value: 'pickup', label: 'Pick up in store (free)' },
            ],
          },
          store: {
            label: 'Store',
            type: 'select',
            placeholder: 'Choose a store…',
            options: STORES,
            required: (m) => m.delivery.method === 'pickup',
            hidden: (m) => m.delivery.method !== 'pickup',
          },
          slot: {
            label: 'Time slot',
            type: 'segmented',
            options: [
              { value: 'morning', label: 'Morning' },
              { value: 'evening', label: 'Evening' },
            ],
          },
        },
      },
      address: {
        title: 'Address',
        // Skipped for store pickup.
        hidden: (m) => m.delivery.method === 'pickup',
        cols: { base: 1, sm: 2 },
        fields: {
          name: { label: 'Full name', required: true, autocomplete: 'shipping name', span: 2 },
          line1: { label: 'Address', required: true, autocomplete: 'shipping street-address', span: 2 },
          city: { label: 'City', required: true, autocomplete: 'shipping address-level2' },
          pin: { label: 'PIN code', required: true, pattern: /^\d{6}$/, inputmode: 'numeric', autocomplete: 'shipping postal-code' },
          phone: { label: 'Phone', type: 'phone', countries: ['IN'], required: true, span: 2 },
        },
      },
      payment: {
        title: 'Payment',
        fields: {
          method: {
            label: 'Pay with',
            type: 'segmented',
            options: [
              { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' },
              { value: 'cod', label: 'Cash on delivery' },
            ],
          },
          upi: {
            label: 'UPI ID',
            placeholder: 'name@bank',
            pattern: /^[\w.-]+@[\w]+$/,
            required: (m) => m.payment.method === 'upi',
            hidden: (m) => m.payment.method !== 'upi',
          },
          card: {
            label: 'Card number',
            mask: '0000 0000 0000 0000',
            autocomplete: 'cc-number',
            required: (m) => m.payment.method === 'card',
            hidden: (m) => m.payment.method !== 'card',
            display: (v) => (v ? `•••• ${v.slice(-4)}` : ''),
            persist: false,
          },
          expiry: {
            label: 'Expiry (MM/YY)',
            mask: '00/00',
            autocomplete: 'cc-exp',
            required: (m) => m.payment.method === 'card',
            hidden: (m) => m.payment.method !== 'card',
            persist: false,
          },
          terms: {
            label: 'I accept the terms of sale',
            type: 'consent',
            required: true,
            policy: { href: 'https://example.com/terms', label: 'Terms of sale' },
          },
        },
      },
    },
    {
      layout: 'steps',
      review: 'Check your order',
      stepParam: 'step',
      omitHidden: true,
      // Reload the page on any step: the answers come back from the draft, and the step from the URL.
      draft: { key: 'ngu-demo-checkout' },
    },
  );
}
