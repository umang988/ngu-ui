import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  defineForm,
  NguForm,
  provideNguCaptcha,
  provideNguFieldTypes,
  type NguCaptchaAdapter,
} from 'ngu-form';
import { provideNguUpload, type NguUploadedFile } from 'ngu-form/upload';
import { fakeUpload } from '../api/fake-upload';
import { MoodPicker } from '../fields/mood-picker';

interface Kit {
  choices: {
    toppings: string[];
    languages: string[];
    newsletter: boolean;
    view: 'list' | 'grid' | 'map';
    size: number;
  };
  numbers: { volume: number; budget: number; stars: number };
  dates: {
    meeting: string;
    appointment: string;
    startMonth: string;
    sprint: string;
    stay: { from: Date | null; to: Date | null };
  };
  contact: {
    phone: string;
    code: string;
    website: string;
    query: string;
    brand: string;
    skills: string[];
  };
  files: { documents: NguUploadedFile[]; avatar: File | null; signature: string };
  agreement: { terms: Date | null; human: string };
  custom: { mood: number };
}

const TOPPINGS = [
  { value: 'cheese', label: 'Extra cheese' },
  { value: 'olives', label: 'Olives' },
  { value: 'peppers', label: 'Peppers' },
  { value: 'pineapple', label: 'Pineapple' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
  { value: 'ja', label: 'Japanese' },
];

const SIZES = [
  { value: 1, label: 'Small' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Large' },
];

/**
 * Stands in for Turnstile, hCaptcha or reCAPTCHA so the example runs offline. A real app
 * passes `nguTurnstile({ siteKey })` (or another adapter) to `provideNguCaptcha` instead.
 */
const demoCaptcha: NguCaptchaAdapter = {
  render(host, events) {
    const label = document.createElement('label');
    label.className = 'demo-captcha';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.addEventListener('change', () =>
      box.checked ? setTimeout(() => events.token(`demo-${Date.now()}`), 300) : events.expired(),
    );
    label.append(box, ' I am not a robot (pretend check)');
    host.replaceChildren(label);
    return { reset: () => (box.checked = false) };
  },
};

@Component({
  selector: 'app-field-types',
  imports: [NguForm],
  providers: [
    provideNguUpload(),
    provideNguCaptcha(demoCaptcha),
    provideNguFieldTypes({ mood: MoodPicker }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngu-form [form]="kit" submitLabel="Send" errorSummary (submitted)="sent.set(show($event))" />
    @if (sent(); as value) {
      <pre class="demo-result">{{ value }}</pre>
    }
  `,
})
export class FieldTypesForm {
  protected readonly sent = signal<string | undefined>(undefined);

  protected readonly kit = defineForm<Kit>(
    {
      choices: { toppings: ['cheese'], languages: [], newsletter: true, view: 'list', size: 2 },
      numbers: { volume: 40, budget: 25000, stars: 0 },
      dates: {
        meeting: '',
        appointment: '',
        startMonth: '',
        sprint: '',
        stay: { from: null, to: null },
      },
      contact: {
        phone: '',
        code: '',
        website: '',
        query: '',
        brand: '#2547d0',
        skills: ['angular'],
      },
      files: { documents: [], avatar: null, signature: '' },
      agreement: { terms: null, human: '' },
      custom: { mood: 0 },
    },
    {
      choices: {
        title: 'Choices',
        cols: { base: 1, md: 2 },
        fields: {
          toppings: {
            label: 'Toppings',
            type: 'checkbox',
            options: TOPPINGS,
            min: 1,
            max: 3,
            hint: 'One to three',
          },
          languages: {
            label: 'Languages you speak',
            type: 'select',
            options: LANGUAGES,
            required: true,
          },
          newsletter: { label: 'Email me product news', type: 'switch' },
          view: {
            label: 'Show results as',
            type: 'segmented',
            options: [
              { value: 'list', label: 'List' },
              { value: 'grid', label: 'Grid' },
              { value: 'map', label: 'Map' },
            ],
          },
          size: {
            label: 'Size',
            type: 'radio',
            options: SIZES,
            hint: 'Number values stay numbers',
          },
        },
      },
      numbers: {
        title: 'Numbers',
        cols: { base: 1, md: 2 },
        fields: {
          volume: { label: 'Volume', type: 'range', min: 0, max: 100, step: 5, suffix: '%' },
          budget: {
            label: 'Budget',
            type: 'currency',
            currency: 'INR',
            min: 0,
            hint: 'Formatted when you leave the field',
          },
          stars: { label: 'How was your visit?', type: 'rating', required: true },
        },
      },
      dates: {
        title: 'Dates and times',
        cols: { base: 1, md: 2 },
        fields: {
          meeting: {
            label: 'Meeting time',
            type: 'time',
            min: '09:00',
            max: '18:00',
            step: 900,
            hint: 'Office hours, in 15-minute steps',
          },
          appointment: { label: 'Appointment', type: 'datetime-local' },
          startMonth: { label: 'Start month', type: 'month' },
          sprint: { label: 'Sprint week', type: 'week' },
          stay: {
            label: 'Stay',
            type: 'daterange',
            span: 2,
            min: '2026-01-01',
            fromLabel: 'Check in',
            toLabel: 'Check out',
          },
        },
      },
      contact: {
        title: 'Contact and identity',
        cols: { base: 1, md: 2 },
        fields: {
          phone: {
            label: 'Mobile number',
            type: 'phone',
            country: 'IN',
            countries: ['IN', 'US', 'GB', 'AE', 'SG', 'DE'],
          },
          code: {
            label: 'Verification code',
            type: 'otp',
            length: 6,
            hint: 'Paste "123-456" to see it fill',
          },
          website: {
            label: 'Website',
            type: 'url',
            placeholder: 'example.com',
            hint: 'https:// is added for you',
          },
          query: { label: 'Search', type: 'search' },
          brand: { label: 'Brand color', type: 'color' },
          skills: {
            label: 'Skills',
            type: 'tags',
            max: 5,
            maxLength: 24,
            hint: 'Enter or comma adds; paste a list',
          },
        },
      },
      files: {
        title: 'Files',
        description: 'From ngu-form/upload.',
        cols: { base: 1, md: 2 },
        fields: {
          documents: {
            label: 'Documents',
            type: 'file',
            accept: '.pdf,.txt,image/*',
            maxSize: 5_000_000,
            max: 4,
            span: 2,
            upload: fakeUpload,
            hint: 'Up to 4 files of 5 MB. A file named "fail" fails, to show Retry.',
          },
          avatar: {
            label: 'Profile photo',
            type: 'image',
            crop: { aspect: 1 },
            maxWidth: 512,
            maxHeight: 512,
          },
          signature: { label: 'Signature', type: 'signature', required: true },
        },
      },
      agreement: {
        title: 'Consent and protection',
        fields: {
          terms: {
            label: 'I accept the terms of service',
            type: 'consent',
            required: true,
            policy: { href: 'https://angular.dev/license', label: 'Read the terms' },
          },
          human: { label: 'Security check', type: 'captcha' },
        },
      },
      custom: {
        title: 'Your own type',
        description: 'A custom type registered with provideNguFieldTypes, with its own options.',
        fields: {
          mood: { label: 'Mood', type: 'mood', faces: ['😞', '😐', '🙂', '😄', '🤩'], min: 1 },
        },
      },
    },
  );

  /** The submitted value as text: files by name and size, signatures shortened. */
  protected show(value: Kit): string {
    return JSON.stringify(
      value,
      (_, v: unknown) =>
        v instanceof File
          ? `File: ${v.name}, ${v.size} bytes`
          : typeof v === 'string' && v.startsWith('data:image')
            ? `${v.slice(0, 32)}… (${v.length} characters)`
            : v,
      2,
    );
  }
}
