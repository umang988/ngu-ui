import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-text-autosize',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class TextAutosizeDemo {
  readonly form = defineForm(
    { notes: '' },
    {
      notes: {
        label: 'Notes',
        type: 'textarea',
        rows: 2,
        maxRows: 8,
        hint: 'Grows as you type, up to 8 rows',
      },
    },
  );
}
