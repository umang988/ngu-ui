import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-draft',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Send" />`,
})
export class DraftDemo {
  // Type, then reload the page: the text comes back with a notice and a Discard button.
  readonly form = defineForm(
    { subject: '', body: '' },
    { subject: 'Subject', body: { label: 'Message', type: 'textarea' } },
    { draft: { key: 'docs-draft-demo' } },
  );
}
