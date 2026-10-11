import { Component, computed, signal } from '@angular/core';
import { NguDropdown, NguDropdownOption, NguDropdownSelection } from 'ngu-dropdown';
import { loadCustomers, type Customer } from './fake-server';

@Component({
  selector: 'demo-dropdown-templates',
  imports: [NguDropdown, NguDropdownOption, NguDropdownSelection],
  template: `
    <div class="dd-demo">
      <div>
        <label for="ship-to">Ship to</label>
        <!-- Two lines need a taller row: the virtual list positions rows by height. -->
        <ngu-dropdown
          inputId="ship-to"
          [fetchFn]="load"
          [(value)]="customerId"
          optionValue="id"
          optionLabel="name"
          [optionHeight]="52"
        >
          <ng-template nguDropdownOption let-customer>
            <span class="dd-row">
              <span>{{ customer.name }}</span>
              <small>{{ customer.city }}, {{ customer.region }}</small>
            </span>
          </ng-template>
          <ng-template nguDropdownSelection let-customer>
            {{ customer.name }} <small>({{ customer.city }})</small>
          </ng-template>
        </ngu-dropdown>
      </div>
    </div>
  `,
})
export class DropdownTemplatesDemo {
  readonly load = loadCustomers;
  readonly customerId = signal<Customer['id'] | null>(null);
  readonly value = computed(() => ({ customerId: this.customerId() }));
}
