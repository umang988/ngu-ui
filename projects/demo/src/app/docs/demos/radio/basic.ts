import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-radio-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class RadioBasicDemo {
  readonly form = defineForm(
    { plan: 'pro' },
    {
      plan: {
        label: 'Plan',
        type: 'radio',
        options: [
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
          { value: 'team', label: 'Team', disabled: true },
        ],
      },
    },
  );
}
