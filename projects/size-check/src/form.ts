import { ChangeDetectionStrategy, Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

// The smallest real use of ngu-form: a login form. Its hand-written twin is form.plain.ts;
// main.plain.ts bootstraps that one; scripts/size.mjs builds both and reports the difference as what ngu-form adds.
@Component({
  selector: 'app-root',
  imports: [NguForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ngu-form [form]="login" submitLabel="Sign in" (submitted)="signIn($event)" />`,
})
export class LoginForm {
  readonly login = defineForm(
    { email: '', password: '', remember: false },
    {
      email: { label: 'Email', type: 'email', required: true, autocomplete: 'email' },
      password: { label: 'Password', type: 'password', required: true, minLength: 8 },
      remember: 'Keep me signed in',
    },
  );

  signIn(value: { email: string; password: string; remember: boolean }): void {
    console.log(value);
  }
}
