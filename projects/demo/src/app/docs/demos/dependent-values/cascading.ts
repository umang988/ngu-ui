import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

const STATES: Record<string, { value: string; label: string }[]> = {
  in: [
    { value: 'mh', label: 'Maharashtra' },
    { value: 'ka', label: 'Karnataka' },
  ],
  us: [
    { value: 'ca', label: 'California' },
    { value: 'ny', label: 'New York' },
  ],
};

@Component({
  selector: 'demo-cascading',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class CascadingDemo {
  readonly form = defineForm(
    { country: 'in', state: '' },
    {
      country: {
        label: 'Country',
        type: 'select',
        options: [
          { value: 'in', label: 'India' },
          { value: 'us', label: 'United States' },
        ],
      },
      // Options from the model: the state clears when its option disappears.
      state: {
        label: 'State',
        type: 'select',
        placeholder: 'Choose…',
        options: (m) => STATES[m.country] ?? [],
      },
    },
    { cols: 2 },
  );
}
