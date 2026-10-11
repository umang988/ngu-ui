import { Component, computed, signal } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';

interface Warehouse {
  code: string;
  name: string;
}

@Component({
  selector: 'demo-dropdown-static-list',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="unit">Unit</label>
        <!-- Strings (or numbers) are their own value and label. -->
        <ngu-dropdown inputId="unit" [options]="units" [(value)]="unit" />
      </div>
      <div>
        <label for="warehouse">Warehouse</label>
        <!-- Any other shape: name the key and the label. -->
        <ngu-dropdown
          inputId="warehouse"
          [options]="warehouses"
          [(value)]="warehouseCode"
          optionValue="code"
          optionLabel="name"
        />
      </div>
    </div>
  `,
})
export class DropdownStaticListDemo {
  readonly units = ['kg', 'g', 'tonne', 'litre', 'pcs', 'box'];

  readonly warehouses: Warehouse[] = [
    { code: 'WH-MUM', name: 'Mumbai central' },
    { code: 'WH-PUN', name: 'Pune east' },
    { code: 'WH-BLR', name: 'Bengaluru north' },
    { code: 'WH-DEL', name: 'Delhi NCR' },
  ];

  readonly unit = signal<string | null>('kg');
  readonly warehouseCode = signal<string | null>(null);
  readonly value = computed(() => ({ unit: this.unit(), warehouseCode: this.warehouseCode() }));
}
