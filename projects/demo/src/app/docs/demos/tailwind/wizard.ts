import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguFormConfig } from 'ngu-form';
import { nguTailwind } from 'ngu-form/tailwind';
import { loadStyles } from '../../../load-styles';

interface Invite {
  team: { name: string; size: string };
  people: { email: string; role: string }[];
}

@Component({
  selector: 'demo-tailwind-wizard',
  imports: [NguForm],
  providers: [provideNguFormConfig({ theme: 'none', classes: nguTailwind })],
  host: { class: 'tw' },
  template: `<ngu-form [form]="form" submitLabel="Send invites" />`,
})
export class TailwindWizardDemo {
  readonly form = defineForm<Invite>(
    { team: { name: '', size: '' }, people: [{ email: '', role: 'member' }] },
    {
      team: {
        title: 'Team',
        cols: 2,
        fields: {
          name: { label: 'Team name', required: true },
          size: {
            label: 'Size',
            type: 'select',
            placeholder: 'Choose one',
            options: [
              { value: 'small', label: '1–10' },
              { value: 'medium', label: '11–50' },
              { value: 'large', label: 'More than 50' },
            ],
          },
        },
      },
      people: {
        title: 'People',
        description: 'They get an email with a link to join.',
        item: {
          email: { label: 'Email', type: 'email', required: true },
          role: {
            label: 'Role',
            type: 'segmented',
            options: [
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
            ],
          },
        },
        newItem: { email: '', role: 'member' },
        addLabel: 'Add person',
        min: 1,
      },
    },
    { layout: 'steps', review: true },
  );

  constructor() {
    loadStyles('tailwind-demo.css');
  }
}
