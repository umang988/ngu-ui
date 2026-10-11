import { Component, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NguDropdown } from 'ngu-dropdown';
import { loadPlants } from './fake-server';

@Component({
  selector: 'demo-dropdown-whole-list',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="plant">Plant</label>
        <ngu-dropdown
          inputId="plant"
          [options]="plants() ?? []"
          [(value)]="plantCode"
          optionValue="code"
          optionLabel="name"
          [placeholder]="plants() ? 'Choose a plant' : 'Loading plants…'"
          [disabled]="!plants()"
        />
      </div>
    </div>
  `,
})
export class DropdownWholeListDemo {
  /** One request for the whole list; searching and scrolling happen in the browser. */
  readonly plants = toSignal(loadPlants());

  readonly plantCode = signal<string | null>(null);
  readonly value = computed(() => ({ plantCode: this.plantCode() }));
}
