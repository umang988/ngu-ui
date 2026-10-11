import { Component, computed, signal } from '@angular/core';
import { NguDropdown, type NguDropdownQuery } from 'ngu-dropdown';
import { loadCustomers } from './fake-server';

@Component({
  selector: 'demo-dropdown-basic',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="customer">Customer</label>
        <ngu-dropdown
          inputId="customer"
          [fetchFn]="load"
          [(value)]="customerId"
          optionValue="id"
          optionLabel="name"
          placeholder="Choose a customer"
          (queryChange)="asked($event)"
        />
      </div>
      <p class="dd-note">Pages requested: {{ pages().join(', ') || 'none yet' }}</p>
    </div>
  `,
})
export class DropdownBasicDemo {
  /** A class field, so the dropdown sees the same function on every check. */
  readonly load = loadCustomers;
  readonly customerId = signal<number | null>(null);
  readonly pages = signal<number[]>([]);
  readonly value = computed(() => ({ customerId: this.customerId() }));

  protected asked(query: NguDropdownQuery): void {
    this.pages.update((pages) => [...pages.slice(-9), query.page]);
  }
}
