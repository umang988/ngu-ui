import { Component, computed, signal } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';
import { findCustomers, loadCustomers } from './fake-server';

@Component({
  selector: 'demo-dropdown-theming',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div class="teal">
        <label for="teal-customer">Customer</label>
        <ngu-dropdown
          inputId="teal-customer"
          [fetchFn]="load"
          [lookupFn]="lookup"
          [(value)]="ids"
          multiple
          optionValue="id"
          optionLabel="name"
        />
      </div>
    </div>
  `,
  styles: `
    /* Any ancestor can set the variables: the app root, a page, or one wrapper. */
    .teal {
      --ngu-primary: #0d9488;
      --ngu-focus-color: #0d9488;
      --ngu-border-color: #5eada5;
      --ngu-radius: 0.875rem;
      --ngu-option-selected-bg: color-mix(in srgb, #0d9488 18%, transparent);
      --ngu-dropdown-shadow: 0 12px 32px rgba(13, 148, 136, 0.25);
    }
  `,
})
export class DropdownThemingDemo {
  readonly load = loadCustomers;
  /** Names the two preset ids, which are on no page the list has loaded. */
  readonly lookup = findCustomers;
  readonly ids = signal<number[]>([3, 41]);
  readonly value = computed(() => ({ ids: this.ids() }));
}
