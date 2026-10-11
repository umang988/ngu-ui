import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-mask',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class MaskDemo {
  // 0 is a digit, a a letter, * either; the model holds only the typed characters.
  readonly form = defineForm(
    { phone: '', card: '', pan: '' },
    {
      phone: { label: 'Phone', mask: '(000) 000-0000', autocomplete: 'tel-national' },
      card: { label: 'Card number', mask: '0000 0000 0000 0000', autocomplete: 'cc-number' },
      pan: { label: 'PAN', mask: 'aaaaa0000a' },
    },
  );
}
