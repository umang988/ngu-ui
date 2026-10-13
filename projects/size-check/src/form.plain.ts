import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { email, form, FormField, minLength, required, submit, type FieldTree } from '@angular/forms/signals';

// The login form of form.ts written by hand with Signal Forms: labels, errors after a touch,
// and a submit that checks first. No password toggle, focus handling or announcements.
@Component({
  selector: 'app-root',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form novalidate (submit)="signIn($event)">
      <label for="email">Email</label>
      <input id="email" type="email" autocomplete="email" [formField]="login.email" aria-describedby="email-error" />
      @if (shown(login.email)) {
        <p id="email-error">{{ login.email().errors()[0].message }}</p>
      }
      <label for="password">Password</label>
      <input id="password" type="password" [formField]="login.password" aria-describedby="password-error" />
      @if (shown(login.password)) {
        <p id="password-error">{{ login.password().errors()[0].message }}</p>
      }
      <label><input type="checkbox" [formField]="login.remember" /> Keep me signed in</label>
      <button type="submit">Sign in</button>
    </form>
  `,
})
export class LoginForm {
  readonly model = signal({ email: '', password: '', remember: false });
  readonly login = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 8, { message: 'Use at least 8 characters' });
  });

  shown(field: FieldTree<string>): boolean {
    const state = field();
    return state.invalid() && state.touched();
  }

  async signIn(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.login, async (tree) => {
      console.log(tree().value());
      return undefined;
    });
  }
}
