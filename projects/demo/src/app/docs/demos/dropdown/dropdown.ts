import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguDropdown } from 'ngu-form/dropdown';
import { searchCities } from './cities';

@Component({
  selector: 'demo-dropdown',
  imports: [NguForm],
  // Usually app-wide, in app.config.ts.
  providers: [provideNguDropdown()],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
export class DropdownDemo {
  readonly form = defineForm(
    { city: null as number | null, visited: [] as number[], status: 'active' },
    {
      // Pages through 10,000 cities on the server as you scroll; search is server-side too.
      city: {
        label: 'Home city',
        type: 'dropdown',
        fetch: searchCities,
        optionValue: 'id',
        optionLabel: (c: { name: string; country: string }) => `${c.name}, ${c.country}`,
        placeholder: 'Pick a city',
        required: true,
      },
      visited: {
        label: 'Cities visited',
        type: 'dropdown',
        fetch: searchCities,
        optionValue: 'id',
        optionLabel: 'name',
        max: 5,
        hint: 'Up to five',
      },
      // A short static list works too.
      status: {
        label: 'Status',
        type: 'dropdown',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'closed', label: 'Closed' },
        ],
      },
    },
  );
}
