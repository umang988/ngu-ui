import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-dates',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class DatesDemo {
  readonly form = defineForm(
    { born: new Date(Date.UTC(1995, 5, 15)), joined: '2024-04-01' },
    {
      // A Date (midnight UTC) or an ISO string, as the model holds it.
      born: { label: 'Date of birth', max: new Date() },
      joined: { label: 'Joined', type: 'date', min: '2020-01-01' },
    },
  );
}
