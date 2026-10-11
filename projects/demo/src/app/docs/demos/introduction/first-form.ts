import { Component, signal } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-first-form',
  imports: [NguForm],
  template: `
    <ngu-form [form]="form" submitLabel="Send message" (submitted)="sent.set(true)" />
    @if (sent()) {
      <p class="demo-success" role="status">Sent. (submitted) emitted the value.</p>
    }
  `,
})
export class FirstFormDemo {
  readonly sent = signal(false);
  readonly form = defineForm(
    { name: '', email: '', topic: 'sales', message: '', copyMe: false },
    {
      name: { label: 'Your name', required: true },
      email: { label: 'Email', type: 'email', required: true },
      topic: {
        label: 'Topic',
        type: 'select',
        options: [
          { value: 'sales', label: 'Sales' },
          { value: 'support', label: 'Support' },
        ],
      },
      message: { label: 'Message', type: 'textarea', required: true, maxLength: 500 },
      copyMe: 'Send me a copy',
    },
  );
}
