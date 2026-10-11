import { Component, resource, signal } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

interface Profile {
  name: string;
  city: string;
}

@Component({
  selector: 'demo-loading',
  imports: [NguForm],
  template: `
    <div class="demo-toolbar">
      <button type="button" (click)="id.set(id() + 1)">Load another record</button>
    </div>
    <ngu-form [form]="form" submitLabel="Save" />
  `,
})
export class LoadingDemo {
  readonly id = signal(1);
  // Any resource fits: httpResource in an app.
  readonly profile = resource({
    params: () => this.id(),
    loader: async ({ params }) => {
      await new Promise((done) => setTimeout(done, 1200));
      return { name: `Customer ${params}`, city: params % 2 ? 'Pune' : 'Jaipur' } satisfies Profile;
    },
  });
  readonly form = defineForm<Profile>(
    { name: '', city: '' },
    { name: 'Name', city: 'City' },
    { load: this.profile },
  );
}
