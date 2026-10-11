import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-time-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class TimeBasicDemo {
  readonly form = defineForm(
    { meeting: '10:30', slot: '', month: '', sprint: '' },
    {
      meeting: { label: 'Meeting', type: 'time' },
      slot: { label: 'Appointment', type: 'datetime-local' },
      month: { label: 'Start month', type: 'month' },
      sprint: { label: 'Sprint', type: 'week' },
    },
  );
}
