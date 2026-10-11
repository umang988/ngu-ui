import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { NguDropdown } from 'ngu-dropdown';
import { findCustomers, loadCustomers } from './fake-server';

@Component({
  selector: 'demo-dropdown-signal-forms',
  imports: [NguDropdown, FormField],
  template: `
    <div class="dd-demo">
      <div>
        <label for="signal-customer">Customer</label>
        <ngu-dropdown
          inputId="signal-customer"
          [formField]="order.customerId"
          [fetchFn]="load"
          [lookupFn]="lookup"
          optionValue="id"
          optionLabel="name"
          describedBy="signal-customer-error"
        />
        <p id="signal-customer-error" class="dd-error">
          @if (order.customerId().touched() && order.customerId().invalid()) {
            {{ order.customerId().errors()[0].message }}
          }
        </p>
      </div>
    </div>
  `,
})
export class DropdownSignalFormsDemo {
  readonly load = loadCustomers;
  readonly lookup = findCustomers;

  readonly value = signal({ customerId: 4821 as number | null });
  readonly order = form(this.value, (p) => {
    required(p.customerId, { message: 'Choose a customer.' });
  });
}
