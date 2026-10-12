import { Component, signal } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-locked',
  imports: [NguForm],
  template: `
    <div class="demo-toolbar">
      <button type="button" [attr.aria-pressed]="locked()" (click)="locked.set(!locked())">Read-only</button>
      <button type="button" [attr.aria-pressed]="saving()" (click)="saving.set(!saving())">Disabled</button>
    </div>
    <ngu-form [form]="form" submitLabel="Save" />
  `,
})
export class LockedDemo {
  protected readonly locked = signal(false);
  protected readonly saving = signal(false);

  readonly form = defineForm(
    { title: 'Quarterly report', owner: 'Asha', reviewers: [{ name: 'Ravi' }] },
    {
      title: { label: 'Title', required: true },
      owner: 'Owner',
      reviewers: { title: 'Reviewers', reorder: true, newItem: { name: '' }, item: { name: 'Name' } },
    },
    // One switch each for every field, list button and the submit button.
    { readonly: this.locked, disabled: this.saving },
  );
}
