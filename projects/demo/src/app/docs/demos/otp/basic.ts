import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-otp-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Verify" />`,
})
export class OtpBasicDemo {
  readonly form = defineForm(
    { code: '' },
    {
      // One input under the boxes: SMS autofill and paste ("123-456") just work.
      code: { label: 'Verification code', type: 'otp', length: 6, required: true },
    },
  );
}
