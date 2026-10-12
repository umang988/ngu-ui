import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguMaterial } from 'ngu-form/material';
import { loadStyles } from '../../../load-styles';

const COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'DE', label: 'Germany' },
  { value: 'US', label: 'United States' },
  { value: 'BR', label: 'Brazil' },
];

@Component({
  selector: 'demo-material',
  imports: [NguForm],
  // Usually app-wide, in app.config.ts.
  providers: [provideNguMaterial({ appearance: 'outline' })],
  host: { class: 'ngu-material-demo' },
  template: `<ngu-form [form]="form" submitLabel="Create account" errorSummary />`,
})
export class MaterialDemo {
  readonly form = defineForm(
    {
      name: '',
      email: '',
      password: '',
      country: '',
      languages: [] as string[],
      seats: 1,
      budget: 0,
      birthday: null as Date | null,
      trip: { from: '', to: '' },
      plan: 'team',
      billing: 'monthly',
      volume: 40,
      interests: [] as string[],
      tags: [] as string[],
      bio: '',
      code: '',
      updates: true,
      terms: null as Date | null,
    },
    {
      name: { label: 'Full name', required: true, hint: 'As on your ID' },
      email: { label: 'Work email', type: 'email', required: true },
      password: { label: 'Password', type: 'password', minLength: 8, strength: true },
      country: { label: 'Country', type: 'select', options: COUNTRIES, required: true },
      languages: {
        label: 'Languages',
        type: 'select',
        options: [
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'Hindi' },
          { value: 'de', label: 'German' },
        ],
      },
      seats: { label: 'Seats', min: 1, max: 50, suffix: 'people' },
      budget: { label: 'Budget', type: 'currency', currency: 'EUR', min: 0 },
      birthday: { label: 'Birthday', type: 'date', max: '2010-12-31' },
      trip: { label: 'Trip', type: 'daterange' },
      plan: {
        label: 'Plan',
        type: 'radio',
        options: [
          { value: 'solo', label: 'Solo' },
          { value: 'team', label: 'Team' },
          { value: 'company', label: 'Company' },
        ],
      },
      billing: {
        label: 'Billing',
        type: 'segmented',
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly' },
        ],
      },
      volume: {
        label: 'Notification volume',
        type: 'range',
        min: 0,
        max: 100,
        step: 10,
        suffix: '%',
      },
      interests: {
        label: 'Interests',
        type: 'checkbox',
        options: [
          { value: 'design', label: 'Design' },
          { value: 'code', label: 'Code' },
          { value: 'data', label: 'Data' },
        ],
      },
      tags: { label: 'Skills', type: 'tags', placeholder: 'Type and press Enter', max: 5 },
      bio: { label: 'About you', type: 'textarea', maxLength: 200, rows: 2, maxRows: 6 },
      code: {
        label: 'Invite code',
        type: 'otp',
        length: 4,
        hint: 'No Material version: ngu-form’s own control',
      },
      updates: { label: 'Product updates', type: 'switch' },
      terms: {
        label: 'I accept the terms',
        type: 'consent',
        required: 'Please accept the terms',
        policy: { href: '/introduction', label: 'Read the terms' },
      },
    },
    { cols: { base: 1, md: 2 } },
  );

  // The docs load the Material theme for this page only; an app sets its theme in styles.scss.
  constructor() {
    loadStyles('material-theme.css');
  }
}
