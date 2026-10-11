import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-time-bounds',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Book" />`,
})
export class TimeBoundsDemo {
  readonly form = defineForm(
    { pickup: '' },
    {
      // Bounds in the input's own format; messages show them for the locale.
      pickup: { label: 'Pickup time', type: 'time', min: '09:00', max: '18:00', step: 900 },
    },
  );
}
