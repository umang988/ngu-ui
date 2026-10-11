import { Component } from '@angular/core';
import { defineForm, NguForm, type SubmitAction, type SubmitErrors } from 'ngu-form';

interface Signup {
  email: string;
  plan: string;
}

@Component({
  selector: 'demo-action',
  imports: [NguForm],
  template: `<ngu-form [form]="form" [action]="register" submitLabel="Register" />`,
})
export class ActionDemo {
  readonly form = defineForm<Signup>(
    { email: 'taken@example.com', plan: 'pro' },
    { email: { label: 'Email', type: 'email', required: true }, plan: 'Plan' },
  );

  // Nothing for success, a string for the form, or messages by field path.
  readonly register: SubmitAction<Signup> = async (value) => {
    await new Promise((done) => setTimeout(done, 700));
    if (value.email.startsWith('taken')) {
      return { email: 'That address already has an account' } satisfies SubmitErrors<Signup>;
    }
    return undefined;
  };
}
