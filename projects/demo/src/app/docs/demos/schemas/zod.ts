import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { z } from 'zod';

const signup = z.object({
  email: z.email('Enter a real email'),
  age: z.number().min(18, 'Adults only'),
  address: z.object({ city: z.string().min(1, 'Which city?') }),
});

@Component({
  selector: 'demo-zod',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Sign up" />`,
})
export class ZodDemo {
  // Every rule comes from the schema; each issue shows on its field.
  readonly form = defineForm(
    { email: '', age: 0, address: { city: '' } },
    { email: 'Email', age: 'Age', address: { city: 'City' } },
    { schema: signup },
  );
}
