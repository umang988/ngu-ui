import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguMessages } from 'ngu-form';

@Component({
  selector: 'demo-messages',
  imports: [NguForm],
  // Rewords built-in texts for this component and its children. ICU plurals work.
  providers: [
    provideNguMessages({
      required: 'Please fill in {label}',
      minLength: '{label}: {minLength, plural, one {# letter} other {# letters}} or more',
    }),
  ],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
export class MessagesDemo {
  readonly form = defineForm(
    { nickname: '' },
    { nickname: { label: 'your nickname', required: true, minLength: 3 } },
  );
}
