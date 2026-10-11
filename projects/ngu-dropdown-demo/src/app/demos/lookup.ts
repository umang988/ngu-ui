import { Component, computed, signal } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';
import { findCustomers, loadCustomers } from './fake-server';

@Component({
  selector: 'demo-dropdown-lookup',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="saved-customer">Customer</label>
        <ngu-dropdown
          inputId="saved-customer"
          [fetchFn]="load"
          [lookupFn]="lookup"
          [(value)]="customerId"
          optionValue="id"
          optionLabel="name"
        />
      </div>
      <button type="button" (click)="openRecord()">Load another saved order</button>
    </div>
  `,
})
export class DropdownLookupDemo {
  readonly load = loadCustomers;
  /** Asked only for ids no loaded page has named. */
  readonly lookup = findCustomers;

  /** As an edit screen would load it: an id, no name. */
  readonly customerId = signal<number | null>(31337);
  readonly value = computed(() => ({ customerId: this.customerId() }));

  protected openRecord(): void {
    this.customerId.set(1 + Math.floor(Math.random() * 50_000));
  }
}
