import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-date-objects',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class DateObjectsDemo {
  readonly form = defineForm(
    { start: new Date(Date.UTC(2026, 9, 12)), end: null as Date | null },
    {
      // Date values are midnight UTC; null needs an explicit type.
      start: { label: 'Start', min: '2026-10-01' },
      end: { label: 'End', type: 'date', min: '2026-10-01' },
    },
  );
}
