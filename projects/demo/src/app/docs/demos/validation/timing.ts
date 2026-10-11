import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-timing',
  imports: [NguForm],
  // "dirty" (default): after a change and leaving the field. "touched": on leaving it.
  // "submit": only after a submit attempt.
  template: `<ngu-form [form]="form" errorsOn="touched" submitLabel="Save" />`,
})
export class TimingDemo {
  readonly form = defineForm(
    { name: '', code: '' },
    {
      name: { label: 'Name (shows on leaving the field)', required: true },
      code: { label: 'Code (shows after a submit)', required: true, errorsOn: 'submit' },
    },
  );
}
