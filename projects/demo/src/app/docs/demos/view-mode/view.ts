import { Component, signal } from '@angular/core';
import { defineForm, NguForm, NguView } from 'ngu-form';

@Component({
  selector: 'demo-view',
  imports: [NguForm, NguView],
  template: `
    <div class="demo-toolbar">
      <button type="button" [attr.aria-pressed]="editing()" (click)="editing.set(!editing())">
        {{ editing() ? 'Done' : 'Edit' }}
      </button>
    </div>
    @if (editing()) {
      <ngu-form [form]="form" />
    } @else {
      <ngu-view [form]="form" />
    }
  `,
})
export class ViewDemo {
  protected readonly editing = signal(false);

  readonly form = defineForm(
    {
      name: 'Asha Patel',
      plan: 'team',
      seats: 12,
      renews: new Date(Date.UTC(2027, 2, 1)),
      billing: { email: 'billing@example.com', address: '' },
      admins: ['asha@example.com', 'ravi@example.com'],
      sso: true,
    },
    {
      name: 'Company',
      plan: {
        label: 'Plan',
        type: 'segmented',
        options: [
          { value: 'free', label: 'Free' },
          { value: 'team', label: 'Team' },
          { value: 'business', label: 'Business' },
        ],
      },
      seats: { label: 'Seats', min: 1, display: (n) => `${n} of 25 used` },
      renews: 'Renews on',
      billing: {
        title: 'Billing',
        fields: { email: { label: 'Invoices to', type: 'email' }, address: { label: 'Address', type: 'textarea' } },
      },
      admins: { title: 'Admins', newItem: '', item: { label: 'Email', type: 'email' } },
      sso: { label: 'Single sign-on', type: 'switch' },
    },
  );
}
