import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

const ROOMS = [
  { value: 'twin', label: 'Twin room' },
  { value: 'double', label: 'Double room' },
  { value: 'suite', label: 'Suite' },
];

@Component({
  selector: 'demo-steps-review',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Book" />`,
})
export class StepsReviewDemo {
  readonly form = defineForm(
    {
      guest: { name: 'Asha Patel', email: 'asha@example.com' },
      stay: { room: 'double', nights: 2, breakfast: true },
      notes: { request: '' },
    },
    {
      guest: {
        title: 'Guest',
        fields: { name: { label: 'Name', required: true }, email: { label: 'Email', type: 'email', required: true } },
      },
      stay: {
        title: 'Stay',
        fields: {
          room: { label: 'Room', type: 'select', options: ROOMS, required: true },
          nights: { label: 'Nights', min: 1, max: 14, display: (n) => (n === 1 ? '1 night' : `${n} nights`) },
          breakfast: 'Breakfast included',
        },
      },
      notes: { title: 'Requests', fields: { request: { label: 'Anything we should know?', type: 'textarea', rows: 2 } } },
    },
    { layout: 'steps', review: true },
  );
}
