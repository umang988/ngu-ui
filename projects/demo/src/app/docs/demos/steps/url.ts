import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-steps-url',
  imports: [NguForm],
  template: `
    <ngu-form [form]="form" submitLabel="Send" />
    <p class="demo-status">Step {{ form.steps.index() + 1 }} of {{ form.steps.count() }}: {{ form.steps.current() }}</p>
  `,
})
export class StepsUrlDemo {
  readonly form = defineForm(
    { topic: { kind: 'bug' }, details: { summary: '', steps: '' }, contact: { email: '' } },
    {
      topic: {
        title: 'Topic',
        fields: {
          kind: {
            label: 'What is it about?',
            type: 'radio',
            options: [
              { value: 'bug', label: 'Something is broken' },
              { value: 'idea', label: 'An idea' },
            ],
          },
        },
      },
      details: {
        title: 'Details',
        fields: {
          summary: { label: 'Summary', required: true, maxLength: 80 },
          steps: { label: 'Steps to reproduce', type: 'textarea', hidden: (m) => m.topic.kind !== 'bug' },
        },
      },
      contact: { title: 'Contact', fields: { email: { label: 'Email', type: 'email', required: true } } },
    },
    // ?step=details in the address bar; the browser's Back button goes to the previous step.
    { layout: 'steps', stepParam: 'step', review: 'Before you send' },
  );
}
