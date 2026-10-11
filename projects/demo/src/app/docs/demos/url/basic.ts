import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-url-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class UrlBasicDemo {
  readonly form = defineForm(
    { website: '', query: '', brand: '#2547d0', fax: '' },
    {
      website: {
        label: 'Website',
        type: 'url',
        placeholder: 'example.com',
        hint: 'https:// is added for you',
      },
      query: { label: 'Search', type: 'search' },
      brand: { label: 'Brand color', type: 'color' },
      fax: { label: 'Fax', type: 'tel', mask: '+00 0000 000000' },
    },
  );
}
