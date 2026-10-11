import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-reset-patch',
  imports: [NguForm],
  template: `
    <div class="demo-toolbar">
      <button type="button" (click)="form.patch({ city: 'Mumbai' })">Patch the city</button>
      <button type="button" (click)="form.reset()">Reset</button>
      <button type="button" (click)="form.reset({ name: 'Ana', city: 'Delhi' })">
        Reset to a record
      </button>
    </div>
    <ngu-form [form]="form" />
  `,
})
export class ResetPatchDemo {
  readonly form = defineForm({ name: '', city: 'Pune' }, { name: 'Name', city: 'City' });
}
