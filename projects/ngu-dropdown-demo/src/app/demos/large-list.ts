import { Component, computed, signal } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';

interface Part {
  id: number;
  label: string;
}

const KINDS = ['Bearing', 'Bolt', 'Bushing', 'Clamp', 'Coupling', 'Gasket', 'Gear', 'Hinge'];
const FINISHES = ['zinc', 'brass', 'steel', 'nylon', 'chrome'];

@Component({
  selector: 'demo-dropdown-large-list',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="part">Spare part</label>
        <ngu-dropdown inputId="part" [options]="parts" [(value)]="partId" optionValue="id" />
      </div>
      <p class="dd-note">
        {{ parts.length.toLocaleString() }} options in memory. Only the rows in view are in the
        page, and search runs in the browser.
      </p>
    </div>
  `,
})
export class DropdownLargeListDemo {
  /** 10,000 rows, built in the browser: no server involved. */
  readonly parts: Part[] = Array.from({ length: 10_000 }, (_, i) => ({
    id: i + 1,
    label: `${KINDS[i % 8]} ${FINISHES[Math.floor(i / 8) % 5]} #${String(i + 1).padStart(5, '0')}`,
  }));

  readonly partId = signal<number | null>(null);
  readonly value = computed(() => ({ partId: this.partId() }));
}
