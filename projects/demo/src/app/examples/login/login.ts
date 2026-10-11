import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'app-login',
  imports: [NguForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ngu-form [form]="login" submitLabel="Sign in" (submitted)="signIn($event)" />
    @if (status()) {
      <p class="demo-success" role="status">{{ status() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 26rem;
    }
  `,
})
export class LoginForm {
  protected readonly login = defineForm({ email: '', password: '', remember: false }, {
    email: { label: 'Email', type: 'email', placeholder: 'you@example.com', required: true, autocomplete: 'email' },
    password: {
      label: 'Password',
      type: 'password',
      required: true,
      minLength: 8,
      autocomplete: 'current-password',
      enterkeyhint: 'go',
    },
    remember: 'Keep me signed in',
  });

  protected readonly status = signal('');

  protected signIn(value: { email: string; password: string; remember: boolean }): void {
    // Replace with your auth call.
    this.status.set(`Signed in as ${value.email}`);
  }
}
