import { Component, computed, signal } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';
import { loadCustomers } from './fake-server';

@Component({
  selector: 'demo-dropdown-multiple',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="accounts">Accounts to notify</label>
        <ngu-dropdown
          inputId="accounts"
          [fetchFn]="load"
          [(value)]="ids"
          multiple
          [maxChips]="2"
          optionValue="id"
          optionLabel="name"
          placeholder="Choose accounts"
        />
      </div>
    </div>
  `,
})
export class DropdownMultipleDemo {
  readonly load = loadCustomers;
  readonly ids = signal<number[]>([]);
  readonly value = computed(() => ({ ids: this.ids() }));
}
