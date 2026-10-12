import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-list-nested',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ListNestedDemo {
  readonly form = defineForm(
    {
      days: [
        { name: 'Day 1', sessions: [{ time: '09:30', title: 'Keynote' }, { time: '11:00', title: 'Signals in depth' }] },
        { name: 'Day 2', sessions: [{ time: '10:00', title: 'Workshops' }] },
      ],
    },
    {
      days: {
        title: 'Schedule',
        addLabel: 'Add day',
        newItem: () => ({ name: '', sessions: [] }),
        item: {
          name: { label: 'Day', required: true },
          sessions: {
            title: 'Sessions',
            cols: { base: 1, sm: 2 },
            reorder: true,
            addLabel: 'Add session',
            newItem: { time: '', title: '' },
            item: {
              time: { label: 'Time', type: 'time', required: true },
              // In a nested list, the second argument is the innermost row.
              title: { label: 'Title', required: (_, session) => session.time !== '' },
            },
          },
        },
      },
    },
  );
}
