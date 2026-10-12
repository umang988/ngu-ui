import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-steps-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Create account" />`,
})
export class StepsBasicDemo {
  readonly form = defineForm(
    {
      account: { email: '', password: '' },
      team: { solo: true, name: '', size: 2 },
      plan: { tier: 'free' },
    },
    {
      account: {
        title: 'Account',
        fields: {
          email: { label: 'Email', type: 'email', required: true, autocomplete: 'email' },
          password: { label: 'Password', type: 'password', minLength: 8, required: true, autocomplete: 'new-password' },
        },
      },
      team: {
        title: 'Team',
        cols: { base: 1, sm: 2 },
        fields: {
          solo: { label: 'Just me for now', type: 'switch', span: 2 },
          name: { label: 'Team name', required: (m) => !m.team.solo, hidden: (m) => m.team.solo },
          size: { label: 'People', min: 2, hidden: (m) => m.team.solo },
        },
      },
      plan: {
        title: 'Plan',
        // Skipped while the workspace is just for one person.
        hidden: (m) => m.team.solo,
        fields: {
          tier: {
            label: 'Plan',
            type: 'segmented',
            options: [
              { value: 'free', label: 'Free' },
              { value: 'team', label: 'Team' },
              { value: 'business', label: 'Business' },
            ],
          },
        },
      },
    },
    { layout: 'steps' },
  );
}
