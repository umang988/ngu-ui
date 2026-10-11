import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

const TAKEN = ['admin', 'angular', 'root'];

/** A pretend server check. */
async function isTaken(name: string, abort: AbortSignal): Promise<boolean> {
  await new Promise((done) => setTimeout(done, 600));
  abort.throwIfAborted();
  return TAKEN.includes(name.toLowerCase());
}

@Component({
  selector: 'demo-async',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Create account" />`,
})
export class AsyncDemo {
  readonly form = defineForm(
    { username: '' },
    {
      username: {
        label: 'Username',
        required: true,
        minLength: 3,
        debounce: 300,
        hint: 'Try admin',
        validateAsync: async (value, model, scope, abort) =>
          (await isTaken(value, abort)) ? 'That name is taken' : undefined,
      },
    },
  );
}
