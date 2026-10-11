import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-otp-alphanumeric',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class OtpAlphanumericDemo {
  readonly form = defineForm(
    { voucher: '' },
    {
      voucher: { label: 'Voucher', type: 'otp', length: 8, characters: 'alphanumeric' },
    },
  );
}
