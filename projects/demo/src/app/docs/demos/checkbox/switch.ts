import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-checkbox-switch',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class CheckboxSwitchDemo {
  readonly form = defineForm(
    { email: true, sms: false, digest: true },
    {
      email: { label: 'Email notifications', type: 'switch' },
      sms: { label: 'Text messages', type: 'switch' },
      digest: { label: 'Weekly digest', type: 'switch', disabled: (m) => !m.email },
    },
  );
}
