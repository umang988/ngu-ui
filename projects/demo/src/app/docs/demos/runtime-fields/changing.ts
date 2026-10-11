import { Component, signal } from '@angular/core';
import { defineForm, NguForm, type DynamicField } from 'ngu-form';

@Component({
  selector: 'demo-runtime-changing',
  imports: [NguForm],
  template: `
    <div class="demo-toolbar">
      <button type="button" (click)="add()">Add question</button>
      <button type="button" (click)="remove()" [disabled]="questions().length === 0">
        Remove last
      </button>
    </div>
    <ngu-form [form]="form" />
  `,
})
export class RuntimeChangingDemo {
  // The list is a signal: the model gains and loses keys as it changes.
  readonly questions = signal<DynamicField[]>([{ key: 'q1', label: 'Question 1', required: true }]);
  readonly form = defineForm(
    { answers: {} as Record<string, string> },
    { answers: { fields: this.questions } },
  );

  add(): void {
    const n = this.questions().length + 1;
    this.questions.update((list) => [...list, { key: `q${n}`, label: `Question ${n}` }]);
  }

  remove(): void {
    this.questions.update((list) => list.slice(0, -1));
  }
}
