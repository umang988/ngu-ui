import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguFieldTypes } from 'ngu-form';
import { MoodPicker } from './mood-picker';

@Component({
  selector: 'demo-mood',
  imports: [NguForm],
  providers: [provideNguFieldTypes({ mood: MoodPicker })],
  template: `<ngu-form [form]="form" submitLabel="Send" />`,
})
export class MoodDemo {
  readonly form = defineForm(
    { mood: 0, comment: '' },
    {
      // Accepted on number properties, with its own faces option, thanks to the type maps.
      mood: {
        label: 'How was today?',
        type: 'mood',
        faces: ['😞', '😐', '🙂', '😄', '🤩'],
        min: 1,
      },
      comment: { label: 'Anything to add?', type: 'textarea' },
    },
  );
}
