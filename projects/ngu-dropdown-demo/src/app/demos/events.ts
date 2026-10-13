import { Component, signal } from '@angular/core';
import { NguDropdown, type NguDropdownQuery } from 'ngu-dropdown';
import { type Customer, loadCustomers } from './fake-server';

interface Entry {
  id: number;
  name: string;
  detail: string;
}

@Component({
  selector: 'demo-dropdown-events',
  imports: [NguDropdown],
  template: `
    <div class="dd-demo">
      <div>
        <label for="event-customers">Customers</label>
        <ngu-dropdown
          inputId="event-customers"
          [fetchFn]="load"
          [(value)]="ids"
          multiple
          optionValue="id"
          optionLabel="name"
          placeholder="Choose customers"
          (focused)="log('focused')"
          (blurred)="log('blurred')"
          (opened)="log('opened')"
          (closed)="log('closed')"
          (searchChange)="log('searchChange', '“' + $event + '”')"
          (queryChange)="log('queryChange', describe($event))"
          (selectionChange)="log('selectionChange', count($event))"
          (added)="log('added', $event.name)"
          (removed)="log('removed', $event.name)"
          (cleared)="log('cleared')"
          (loadError)="log('loadError')"
        />
      </div>
      <ol class="dd-log" aria-label="Events, newest first">
        @for (entry of entries(); track entry.id) {
          <li>
            <code>({{ entry.name }})</code> <span>{{ entry.detail }}</span>
          </li>
        } @empty {
          <li class="dd-log__empty">Tab into the field, open it, search and pick a few rows.</li>
        }
      </ol>
    </div>
  `,
})
export class DropdownEventsDemo {
  readonly load = loadCustomers;
  readonly ids = signal<number[]>([]);
  readonly entries = signal<Entry[]>([]);
  private nextId = 0;

  protected log(name: string, detail = ''): void {
    this.entries.update((list) => [{ id: this.nextId++, name, detail }, ...list].slice(0, 16));
  }

  protected describe(query: NguDropdownQuery): string {
    return query.search ? `page ${query.page}, “${query.search}”` : `page ${query.page}`;
  }

  protected count(rows: Customer | Customer[] | null): string {
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    return list.length === 1 ? '1 row' : `${list.length} rows`;
  }
}
