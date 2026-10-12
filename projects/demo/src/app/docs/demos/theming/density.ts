import { Component } from '@angular/core';
import { defineForm, NguForm, type NguDensity, type NguSize } from 'ngu-form';

@Component({
  selector: 'demo-density',
  imports: [NguForm],
  // The first two fields restyle the form they are in.
  template: `
    <ngu-form
      [form]="form"
      [density]="form.value().look.density"
      [size]="form.value().look.size"
      submitLabel="Book"
    />
  `,
})
export class DensityDemo {
  readonly form = defineForm(
    {
      look: { density: 'normal' as NguDensity, size: 'md' as NguSize },
      name: '',
      guests: 2,
      date: '',
      notes: '',
    },
    {
      look: {
        span: 2,
        cols: { base: 1, sm: 2 },
        fields: {
          density: {
            label: 'Density',
            type: 'segmented',
            options: [
              { value: 'compact', label: 'Compact' },
              { value: 'normal', label: 'Normal' },
              { value: 'spacious', label: 'Spacious' },
            ],
          },
          size: {
            label: 'Size',
            type: 'segmented',
            options: [
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
            ],
          },
        },
      },
      $divider: { divider: true },
      name: { label: 'Name', required: true },
      guests: { label: 'Guests', min: 1, max: 12 },
      date: { label: 'Date', type: 'date' },
      notes: { label: 'Notes', type: 'textarea', hint: 'Allergies, occasions' },
    },
    { cols: { base: 1, sm: 2 } },
  );
}
