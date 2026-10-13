import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { defineForm, NguForm, provideNguCaptcha, type NguCaptchaAdapter } from 'ngu-form';
import { provideNguUpload, type NguUploadedFile } from 'ngu-form/upload';

// Every built-in field type with fixed values, for the visual regression screenshots in
// e2e/visual.spec.ts. Not in the sidebar. `?dir=rtl` lays it out right to left.

const OPTIONS = [
  { value: 'tea', label: 'Tea' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'juice', label: 'Juice' },
];

/** A captcha that draws a fixed box, so screenshots never depend on a third party. */
const stillCaptcha: NguCaptchaAdapter = {
  render(host) {
    const box = document.createElement('div');
    box.className = 'gallery-captcha';
    box.textContent = 'Captcha';
    host.replaceChildren(box);
    return { reset: () => undefined };
  },
};

interface Kit {
  text: string;
  email: string;
  password: string;
  textarea: string;
  number: number;
  currency: number;
  range: number;
  rating: number;
  date: Date | null;
  time: string;
  datetime: string;
  month: string;
  week: string;
  stay: { from: Date | null; to: Date | null };
  checkbox: boolean;
  switch: boolean;
  checkboxGroup: string[];
  radio: string;
  segmented: string;
  select: string;
  multiSelect: string[];
  url: string;
  search: string;
  tel: string;
  color: string;
  phone: string;
  otp: string;
  tags: string[];
  consent: Date | null;
  captcha: string;
  file: NguUploadedFile[];
  image: File | null;
  signature: string;
}

interface States {
  hint: string;
  adorned: number;
  readonly: string;
  disabled: string;
  required: string;
  tooShort: string;
}

@Component({
  selector: 'app-gallery',
  imports: [NguForm],
  providers: [provideNguUpload(), provideNguCaptcha(stillCaptcha)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gallery" [attr.dir]="dir">
      <h1>Field gallery</h1>
      <section class="gallery-types" aria-label="Every type">
        <ngu-form [form]="kit" submitLabel="Send" />
      </section>
      <section class="gallery-states" aria-label="States">
        <h2>States</h2>
        <ngu-form [form]="states" submitLabel="Check" />
      </section>
    </div>
  `,
  styles: `
    .gallery {
      max-width: 40rem;
      margin: 0 auto;
      padding: 2rem 1rem 4rem;
    }
    .gallery-states {
      margin-top: 3rem;
    }
    :host ::ng-deep .gallery-captcha {
      inline-size: 18rem;
      padding: 1rem;
      border: 1px dashed currentColor;
    }
  `,
})
export class Gallery {
  protected readonly dir = inject(ActivatedRoute).snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly kit = defineForm<Kit>(
    {
      text: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct horse',
      textarea: 'Wrote the first published program, for the Analytical Engine.',
      number: 42,
      currency: 125000,
      range: 60,
      rating: 4,
      date: new Date(Date.UTC(2026, 2, 14)),
      time: '09:30',
      datetime: '2026-03-14T09:30',
      month: '2026-03',
      week: '2026-W11',
      stay: { from: new Date(Date.UTC(2026, 2, 14)), to: new Date(Date.UTC(2026, 2, 18)) },
      checkbox: true,
      switch: true,
      checkboxGroup: ['tea', 'juice'],
      radio: 'coffee',
      segmented: 'tea',
      select: 'coffee',
      multiSelect: ['tea'],
      url: 'https://angular.dev',
      search: 'signal forms',
      tel: '020 7946 0000',
      color: '#2547d0',
      phone: '+919876543210',
      otp: '123456',
      tags: ['angular', 'signals'],
      consent: null,
      captcha: '',
      file: [],
      image: null,
      signature: '',
    },
    {
      text: 'Text',
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
      textarea: { label: 'Textarea', type: 'textarea', rows: 2, maxLength: 160 },
      number: { label: 'Number', min: 0 },
      currency: { label: 'Currency', type: 'currency', currency: 'INR' },
      range: { label: 'Range', type: 'range', min: 0, max: 100, step: 5, suffix: '%' },
      rating: { label: 'Rating', type: 'rating' },
      date: { label: 'Date', type: 'date' },
      time: { label: 'Time', type: 'time' },
      datetime: { label: 'Date and time', type: 'datetime-local' },
      month: { label: 'Month', type: 'month' },
      week: { label: 'Week', type: 'week' },
      stay: { label: 'Date range', type: 'daterange', fromLabel: 'From', toLabel: 'To' },
      checkbox: 'Checkbox',
      switch: { label: 'Switch', type: 'switch' },
      checkboxGroup: { label: 'Checkbox group', type: 'checkbox', options: OPTIONS },
      radio: { label: 'Radio', type: 'radio', options: OPTIONS },
      segmented: { label: 'Segmented', type: 'segmented', options: OPTIONS },
      select: { label: 'Select', type: 'select', options: OPTIONS },
      multiSelect: { label: 'Multiple select', type: 'select', options: OPTIONS },
      url: { label: 'URL', type: 'url' },
      search: { label: 'Search', type: 'search' },
      tel: { label: 'Telephone', type: 'tel' },
      color: { label: 'Color', type: 'color' },
      phone: { label: 'Phone', type: 'phone', country: 'IN', countries: ['IN', 'US', 'GB'] },
      otp: { label: 'One-time code', type: 'otp', length: 6 },
      tags: { label: 'Tags', type: 'tags' },
      consent: { label: 'I accept the terms', type: 'consent' },
      captcha: { label: 'Captcha', type: 'captcha' },
      file: { label: 'File', type: 'file' },
      image: { label: 'Image', type: 'image' },
      signature: { label: 'Signature', type: 'signature' },
    },
  );

  protected readonly states = defineForm<States>(
    { hint: '', adorned: 18, readonly: 'Read only', disabled: 'Disabled', required: '', tooShort: 'ab' },
    {
      hint: { label: 'With a hint', hint: 'Hints sit under the control', placeholder: 'Placeholder' },
      adorned: { label: 'Prefix and suffix', prefix: '₹', suffix: 'per hour' },
      readonly: { label: 'Read only', readonly: true },
      disabled: { label: 'Disabled', disabled: true },
      required: { label: 'Required', required: true },
      tooShort: { label: 'Too short', minLength: 3 },
    },
  );
}
