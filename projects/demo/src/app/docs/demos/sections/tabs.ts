import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-sections-tabs',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save settings" />`,
})
export class SectionsTabsDemo {
  readonly form = defineForm(
    {
      profile: { name: '', bio: '' },
      notifications: { email: '', digest: 'weekly' },
      security: { twoFactor: false, phone: '' },
    },
    {
      profile: {
        title: 'Profile',
        fields: { name: { label: 'Display name', required: true }, bio: { label: 'Bio', type: 'textarea', maxLength: 160 } },
      },
      notifications: {
        title: 'Notifications',
        fields: {
          email: { label: 'Send to', type: 'email', required: true },
          digest: {
            label: 'Digest',
            type: 'segmented',
            options: [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'never', label: 'Never' },
            ],
          },
        },
      },
      security: {
        title: 'Security',
        fields: {
          twoFactor: { label: 'Two-factor sign-in', type: 'switch' },
          phone: { label: 'Phone for codes', type: 'tel', required: (m) => m.security.twoFactor, hidden: (m) => !m.security.twoFactor },
        },
      },
    },
    { layout: 'tabs' },
  );
}
