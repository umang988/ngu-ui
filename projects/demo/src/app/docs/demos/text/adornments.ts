import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-text-adornments',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class TextAdornmentsDemo {
  readonly form = defineForm(
    { handle: '', domain: '' },
    {
      handle: { label: 'Username', prefix: '@' },
      domain: { label: 'Subdomain', suffix: '.example.com', autocomplete: 'off' },
    },
  );
}
