import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-sections-accordion',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Publish" />`,
})
export class SectionsAccordionDemo {
  readonly form = defineForm(
    {
      title: '',
      details: { summary: '', tags: [] as string[] },
      schedule: { date: '', time: '09:00' },
      advanced: { slug: '', canonical: '' },
    },
    {
      title: { label: 'Title', required: true },
      details: {
        title: 'Details',
        collapsed: false,
        fields: { summary: { label: 'Summary', type: 'textarea', required: true }, tags: { label: 'Tags', type: 'tags' } },
      },
      schedule: {
        title: 'Schedule',
        collapsed: true,
        cols: { base: 1, sm: 2 },
        fields: { date: { label: 'Date', type: 'date', required: true }, time: { label: 'Time', type: 'time' } },
      },
      advanced: {
        title: 'Advanced',
        collapsed: true,
        fields: {
          slug: { label: 'Slug', pattern: /^[a-z0-9-]*$/, hint: 'Lowercase letters, digits and dashes' },
          canonical: { label: 'Canonical URL', type: 'url' },
        },
      },
    },
  );
}
