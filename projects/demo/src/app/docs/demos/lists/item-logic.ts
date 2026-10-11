import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-list-item-logic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ListItemLogicDemo {
  readonly form = defineForm(
    { gifts: [{ name: 'Book', wrap: true, note: 'Happy birthday!' }] },
    {
      gifts: {
        title: 'Gifts',
        newItem: () => ({ name: '', wrap: false, note: '' }),
        item: {
          name: 'Gift',
          wrap: 'Gift wrap',
          // Logic inside item receives the row as its second argument.
          note: { label: 'Note on the wrapping', hidden: (_, gift) => !gift.wrap },
        },
      },
    },
  );
}
