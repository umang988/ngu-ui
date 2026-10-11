import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-state',
  imports: [NguForm],
  template: `
    <ngu-form [form]="form" />
    <p class="demo-status">
      dirty: {{ form.dirty() }} · touched: {{ form.touched() }} · valid: {{ form.valid() }} ·
      pending: {{ form.pending() }}
    </p>
  `,
})
export class StateDemo {
  readonly form = defineForm({ title: '' }, { title: { label: 'Title', required: true } });
}
