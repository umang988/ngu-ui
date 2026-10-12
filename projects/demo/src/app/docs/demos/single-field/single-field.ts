import { Component, signal } from '@angular/core';
import { email, form, required, submit } from '@angular/forms/signals';
import { NguField } from 'ngu-form';

// A hand-written Signal Forms form: ngu-field adds the label, hint and messages.
@Component({
  selector: 'demo-single-field',
  imports: [NguField],
  template: `
    <form class="demo-stack" novalidate (submit)="send($event)">
      <ngu-field
        [field]="f.email"
        [def]="{ label: 'Email', type: 'email', hint: 'For the receipt', errorsOn: 'touched' }"
      />
      <ngu-field
        [field]="f.amount"
        [def]="{ label: 'Amount', type: 'currency', currency: 'INR', errorsOn: 'touched' }"
      />
      <button type="submit" class="demo-button">Pay</button>
    </form>
  `,
})
export class SingleFieldDemo {
  readonly model = signal({ email: '', amount: 0 });
  readonly f = form(this.model, (p) => {
    required(p.email, { message: 'Enter your email' });
    email(p.email);
  });
  readonly value = this.model.asReadonly();

  protected send(event: Event): void {
    event.preventDefault();
    // submit() marks every field touched, so errorsOn: 'touched' shows what is missing.
    void submit(this.f, async () => undefined);
  }
}
