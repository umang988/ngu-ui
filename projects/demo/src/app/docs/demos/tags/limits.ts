import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-tags-limits',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class TagsLimitsDemo {
  readonly form = defineForm(
    { keywords: [] as string[] },
    {
      keywords: {
        label: 'Keywords',
        type: 'tags',
        min: 2,
        max: 5,
        maxLength: 20,
        separators: [',', ';'],
        hint: 'Two to five; comma or semicolon adds one',
      },
    },
  );
}
