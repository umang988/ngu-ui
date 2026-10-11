import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-tags-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class TagsBasicDemo {
  readonly form = defineForm(
    { skills: ['angular', 'signals'] as string[] },
    {
      skills: { label: 'Skills', type: 'tags', placeholder: 'Type and press Enter' },
    },
  );
}
