import { Component, computed, signal } from '@angular/core';
import { NguDropdown, NguDropdownOption } from 'ngu-dropdown';

interface Assignment {
  id: number;
  employee: { name: string; code: string };
}

interface Sku {
  skuCode: string;
  description: string;
}

@Component({
  selector: 'demo-dropdown-labels',
  imports: [NguDropdown, NguDropdownOption],
  template: `
    <div class="dd-demo">
      <div>
        <label for="assignee">Assigned to</label>
        <!-- A dot path reads a nested field. -->
        <ngu-dropdown
          inputId="assignee"
          [options]="assignments"
          [(value)]="assigneeId"
          optionValue="id"
          optionLabel="employee.name"
        />
      </div>
      <div>
        <label for="sku">SKU</label>
        <!-- A function joins fields; search, chips and screen readers use the result.
             The template only styles the two parts. -->
        <ngu-dropdown
          inputId="sku"
          [options]="skus"
          [(value)]="skuCode"
          optionValue="skuCode"
          [optionLabel]="skuLabel"
          placeholder="Search by code or description"
        >
          <ng-template nguDropdownOption let-sku>
            <span class="dd-code">{{ sku.skuCode }}</span>
            <span class="dd-desc">{{ sku.description }}</span>
          </ng-template>
        </ngu-dropdown>
      </div>
    </div>
  `,
})
export class DropdownLabelsDemo {
  readonly assignments: Assignment[] = [
    { id: 1, employee: { name: 'Asha Rao', code: 'E-104' } },
    { id: 2, employee: { name: 'Vikram Shah', code: 'E-117' } },
    { id: 3, employee: { name: 'Meera Iyer', code: 'E-131' } },
    { id: 4, employee: { name: 'Kabir Singh', code: 'E-142' } },
  ];

  readonly skus: Sku[] = [
    ['SKU-1001', 'Hex bolt M8 × 40'],
    ['SKU-1002', 'Hex nut M8'],
    ['SKU-1003', 'Flat washer M8'],
    ['SKU-1004', 'Spring washer M8'],
    ['SKU-1005', 'Hex bolt M10 × 50'],
    ['SKU-1006', 'Hex nut M10'],
    ['SKU-1007', 'Anchor bolt M12'],
    ['SKU-1008', 'Threaded rod M10, 1 m'],
    ['SKU-1009', 'Cable tie 200 mm, pack of 100'],
    ['SKU-1010', 'Hose clamp 25–40 mm'],
    ['SKU-1011', 'PVC pipe 32 mm, 3 m'],
    ['SKU-1012', 'Ball valve 1 inch'],
  ].map(([skuCode, description]) => ({ skuCode, description }));

  /** Shown in the field, searched, and read by screen readers: "SKU-1002 - Hex nut M8". */
  readonly skuLabel = (sku: Sku) => `${sku.skuCode} - ${sku.description}`;

  readonly assigneeId = signal<number | null>(2);
  readonly skuCode = signal<string | null>('SKU-1002');
  readonly value = computed(() => ({ assigneeId: this.assigneeId(), skuCode: this.skuCode() }));
}
