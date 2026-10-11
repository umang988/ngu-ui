import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-rating-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class RatingBasicDemo {
  readonly form = defineForm(
    { food: 4, service: 0 },
    {
      food: { label: 'Food', type: 'rating' },
      service: { label: 'Service', type: 'rating', hint: 'Click a chosen star again to clear it' },
    },
  );
}
