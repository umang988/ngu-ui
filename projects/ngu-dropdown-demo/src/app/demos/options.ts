import { Component, computed, signal } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';

interface Status {
  value: string;
  label: string;
  retired: boolean;
}

@Component({
  selector: 'demo-dropdown-options',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="status">Status</label>
        <ngu-dropdown
          inputId="status"
          [options]="statuses"
          [optionDisabled]="isRetired"
          [(value)]="status"
          [clearable]="false"
        />
      </div>
      <div>
        <label for="priority">Priority</label>
        <!-- A plain string list is its own value and label. -->
        <ngu-dropdown inputId="priority" [options]="priorities" [(value)]="priority" size="sm" />
      </div>
    </div>
  `,
})
export class DropdownOptionsDemo {
  readonly statuses: Status[] = [
    { value: 'draft', label: 'Draft', retired: false },
    { value: 'review', label: 'In review', retired: false },
    { value: 'hold', label: 'On hold (retired)', retired: true },
    { value: 'approved', label: 'Approved', retired: false },
  ];
  readonly priorities = ['Low', 'Medium', 'High'];

  readonly isRetired = (status: Status) => status.retired;

  readonly status = signal('draft');
  readonly priority = signal<string | null>(null);
  readonly value = computed(() => ({ status: this.status(), priority: this.priority() }));
}
