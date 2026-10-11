import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguUpload } from 'ngu-form/upload';

@Component({
  selector: 'demo-signature-basic',
  imports: [NguForm],
  providers: [provideNguUpload()],
  template: `<ngu-form [form]="form" submitLabel="Sign" />`,
})
export class SignatureBasicDemo {
  readonly form = defineForm(
    { name: '', signature: '' },
    {
      name: { label: 'Full name', required: true },
      // A PNG data URL, or '' while empty. "Type instead" signs with the keyboard.
      signature: { label: 'Signature', type: 'signature', required: true },
    },
  );
}
