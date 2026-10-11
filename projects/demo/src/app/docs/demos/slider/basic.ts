import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-slider-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class SliderBasicDemo {
  readonly form = defineForm(
    { volume: 40 },
    {
      volume: { label: 'Volume', type: 'range', min: 0, max: 100, step: 5, suffix: '%' },
    },
  );
}
