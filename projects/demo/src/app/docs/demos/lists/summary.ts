import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-list-summary',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
export class ListSummaryDemo {
  readonly form = defineForm(
    {
      people: [
        { name: 'Asha Patel', role: 'owner', email: 'asha@example.com' },
        { name: 'Ravi Shah', role: 'editor', email: '' },
      ],
    },
    {
      people: {
        title: 'Team members',
        // One line per row; rows open to edit, and rows with problems open on submit.
        summary: (p) => (p.name ? `${p.name} · ${p.role}` : ''),
        cols: { base: 1, sm: 2 },
        addLabel: 'Add member',
        newItem: { name: '', role: 'viewer', email: '' },
        item: {
          name: { label: 'Name', required: true },
          role: {
            label: 'Role',
            type: 'select',
            options: [
              { value: 'owner', label: 'Owner' },
              { value: 'editor', label: 'Editor' },
              { value: 'viewer', label: 'Viewer' },
            ],
          },
          email: { label: 'Email', type: 'email', required: true, span: 2 },
        },
      },
    },
  );
}
