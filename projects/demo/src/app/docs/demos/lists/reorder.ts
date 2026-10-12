import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-list-reorder',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ListReorderDemo {
  readonly form = defineForm(
    {
      agenda: [
        { topic: 'Welcome', minutes: 5 },
        { topic: 'Roadmap review', minutes: 20 },
        { topic: 'Questions', minutes: 10 },
      ],
    },
    {
      agenda: {
        title: 'Agenda',
        description: 'Drag a row by its handle, or use the arrow buttons.',
        cols: { base: 1, sm: 2 },
        reorder: true,
        duplicate: true,
        max: 8,
        addLabel: 'Add topic',
        newItem: { topic: '', minutes: 10 },
        item: {
          topic: { label: 'Topic', required: true },
          minutes: { label: 'Minutes', min: 1, max: 120, suffix: 'min' },
        },
      },
    },
  );
}
