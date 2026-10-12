import { Component, effect, inject } from '@angular/core';
import Aura from '@primeuix/themes/aura';
import { ThemeService } from 'docs-kit/ui/theme';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguPrimeNG } from 'ngu-form/primeng';
import { PrimeNG } from 'primeng/config';

@Component({
  selector: 'demo-primeng',
  imports: [NguForm],
  // Usually app-wide, in app.config.ts, next to providePrimeNG({ theme: { preset: Aura } }).
  providers: [provideNguPrimeNG()],
  host: { class: 'ngu-prime-demo' },
  template: `<ngu-form [form]="form" submitLabel="Place order" errorSummary />`,
})
export class PrimeNgDemo {
  readonly form = defineForm(
    {
      company: '',
      email: '',
      phoneMask: '',
      quantity: 10,
      price: 0,
      product: '',
      addOns: [] as string[],
      delivery: null as Date | null,
      window: { from: null as Date | null, to: null as Date | null },
      priority: 'normal',
      channel: 'email',
      discount: 5,
      labels: [] as string[],
      code: '',
      rating: 0,
      notes: '',
      gift: false,
      express: true,
    },
    {
      company: { label: 'Company', required: true },
      email: { label: 'Email', type: 'email', required: true, prefix: '@' },
      phoneMask: { label: 'Phone', mask: '(000) 000-0000', hint: 'A mask: p-inputmask' },
      quantity: { label: 'Quantity', min: 1, max: 500 },
      price: { label: 'Unit price', type: 'currency', currency: 'USD', min: 0 },
      product: {
        label: 'Product',
        type: 'select',
        required: true,
        options: [
          { value: 'chair', label: 'Chair' },
          { value: 'desk', label: 'Desk' },
          { value: 'lamp', label: 'Lamp' },
        ],
      },
      addOns: {
        label: 'Add-ons',
        type: 'select',
        options: [
          { value: 'assembly', label: 'Assembly' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'recycling', label: 'Recycling' },
        ],
      },
      delivery: { label: 'Delivery date', type: 'date', min: new Date() },
      window: { label: 'Delivery window', type: 'daterange' },
      priority: {
        label: 'Priority',
        type: 'radio',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'High' },
        ],
      },
      channel: {
        label: 'Updates by',
        type: 'segmented',
        options: [
          { value: 'email', label: 'Email' },
          { value: 'sms', label: 'SMS' },
        ],
      },
      discount: { label: 'Discount', type: 'range', min: 0, max: 30, suffix: '%' },
      labels: { label: 'Labels', type: 'tags' },
      code: { label: 'Coupon code', type: 'otp', length: 4, characters: 'alphanumeric' },
      rating: { label: 'How did we do last time?', type: 'rating' },
      notes: { label: 'Notes', type: 'textarea', maxLength: 300 },
      gift: 'This is a gift',
      express: { label: 'Express delivery', type: 'switch' },
    },
    { cols: { base: 1, md: 2 } },
  );

  // The docs set PrimeNG's theme here; an app uses providePrimeNG in app.config.ts.
  constructor() {
    inject(PrimeNG).setConfig({
      theme: { preset: Aura, options: { darkModeSelector: '.ngu-prime-dark' } },
    });
    const site = inject(ThemeService);
    effect(() =>
      document.documentElement.classList.toggle('ngu-prime-dark', site.theme() === 'dark'),
    );
  }
}
