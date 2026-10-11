import { Component } from '@angular/core';
import { defineForm, NguForm, type DynamicField } from 'ngu-form';

/** Plain JSON, as an API would send it. */
const QUESTIONS: DynamicField[] = [
  {
    key: 'role',
    label: 'Your role',
    type: 'select',
    default: 'dev',
    options: [
      { value: 'dev', label: 'Developer' },
      { value: 'design', label: 'Designer' },
    ],
  },
  { key: 'years', label: 'Years of Angular', type: 'number', default: 1, min: 0 },
  {
    key: 'signals',
    label: 'Do you use signals?',
    type: 'radio',
    default: 'yes',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    key: 'blocker',
    label: 'What is stopping you?',
    type: 'textarea',
    required: true,
    showIf: { key: 'signals', equals: 'no' },
  },
];

@Component({
  selector: 'demo-runtime-json',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class RuntimeJsonDemo {
  readonly form = defineForm(
    { answers: {} as Record<string, unknown> },
    { answers: { title: 'Survey', fields: QUESTIONS } },
  );
}
