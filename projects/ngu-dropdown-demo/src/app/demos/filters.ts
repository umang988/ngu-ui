import { Component, computed, signal } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';
import { loadCustomers, REGIONS, type Region } from './fake-server';

@Component({
  selector: 'demo-dropdown-filters',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="region">Region</label>
        <ngu-dropdown
          inputId="region"
          [options]="regions"
          [(value)]="region"
          placeholder="Any region"
        />
      </div>
      <div>
        <label for="region-customer">Customer</label>
        <!-- A new region reloads the list from page 0. -->
        <ngu-dropdown
          inputId="region-customer"
          [fetchFn]="load"
          [filters]="{ region: region() }"
          sortBy="name"
          sortOrder="asc"
          [(value)]="customerId"
          optionValue="id"
          optionLabel="name"
        />
      </div>
    </div>
  `,
})
export class DropdownFiltersDemo {
  readonly load = loadCustomers;
  readonly regions = REGIONS;
  readonly region = signal<Region | null>('South');
  readonly customerId = signal<number | null>(null);
  readonly value = computed(() => ({ region: this.region(), customerId: this.customerId() }));
}
