import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-rating-stars',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Send" />`,
})
export class RatingStarsDemo {
  readonly form = defineForm(
    { score: 0 },
    {
      // Ten stars, and a rating is needed before the form can be sent.
      score: {
        label: 'How likely are you to recommend us?',
        type: 'rating',
        max: 10,
        required: true,
      },
    },
  );
}
