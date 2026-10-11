import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-slider-steps',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class SliderStepsDemo {
  readonly form = defineForm(
    { budget: 15000, guests: 4 },
    {
      budget: { label: 'Budget', type: 'range', min: 5000, max: 50000, step: 2500, prefix: '₹' },
      guests: { label: 'Guests', type: 'range', min: 1, max: 12 },
    },
  );
}
