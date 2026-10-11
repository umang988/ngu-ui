import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-select-multiple',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class SelectMultipleDemo {
  readonly form = defineForm(
    { languages: ['en'] as string[] },
    {
      // On a list, select becomes a multiple select.
      languages: {
        label: 'Languages',
        type: 'select',
        max: 3,
        options: [
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'Hindi' },
          { value: 'ar', label: 'Arabic' },
          { value: 'es', label: 'Spanish' },
          { value: 'ja', label: 'Japanese' },
        ],
      },
    },
  );
}
