import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-history',
  imports: [NguForm],
  template: `
    <div class="demo-toolbar">
      <button type="button" (click)="form.history.undo()" [disabled]="!form.history.canUndo()">
        Undo
      </button>
      <button type="button" (click)="form.history.redo()" [disabled]="!form.history.canRedo()">
        Redo
      </button>
    </div>
    <ngu-form [form]="form" />
  `,
})
export class HistoryDemo {
  // Ctrl+Z and Ctrl+Shift+Z (⌘ on a Mac) work inside the form too.
  readonly form = defineForm(
    { title: 'Quarterly report', status: 'draft' },
    {
      title: 'Title',
      status: {
        label: 'Status',
        type: 'segmented',
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'review', label: 'In review' },
          { value: 'done', label: 'Done' },
        ],
      },
    },
    { history: true },
  );
}
