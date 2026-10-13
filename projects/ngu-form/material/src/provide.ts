import type { Provider } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideNguFieldRenderers } from 'ngu-form';
import { NguMatCheck } from './check';
import { NguMatChips } from './chips';
import { NguMatChoice } from './choice';
import { NguMatDate, NguMatDateRange } from './date';
import { NguMatInput } from './input';
import { NguMatSelect } from './select';
import { NGU_MATERIAL_OPTIONS, type NguMaterialOptions } from './shared';
import { NguMatSlider } from './slider';

/**
 * Renders fields as Angular Material form fields. Text, email, URL, search, telephone, number,
 * amount, password, textarea, time, date-time, month and week fields become `mat-form-field`
 * inputs; selects `mat-select`; checkboxes,
 * groups, switches and consent `mat-checkbox` and `mat-slide-toggle`; radios and segments
 * `mat-radio-group` and `mat-button-toggle-group`; sliders `mat-slider`; tags chips; dates
 * and date ranges Material's datepicker. One-time codes, phone, rating, color and captcha
 * keep ngu-form's own controls, colored by the tokens.
 *
 * ```ts
 * providers: [provideNguMaterial({ appearance: 'outline' })]
 * ```
 */
export function provideNguMaterial(options: NguMaterialOptions = {}): Provider[] {
  return [
    { provide: NGU_MATERIAL_OPTIONS, useValue: options },
    ...(options.dateAdapter === false ? [] : provideNativeDateAdapter()),
    provideNguFieldRenderers({
      text: NguMatInput,
      email: NguMatInput,
      password: NguMatInput,
      number: NguMatInput,
      currency: NguMatInput,
      url: NguMatInput,
      search: NguMatInput,
      tel: NguMatInput,
      textarea: NguMatInput,
      time: NguMatInput,
      'datetime-local': NguMatInput,
      month: NguMatInput,
      week: NguMatInput,
      select: NguMatSelect,
      checkbox: NguMatCheck,
      switch: NguMatCheck,
      consent: NguMatCheck,
      radio: NguMatChoice,
      segmented: NguMatChoice,
      range: NguMatSlider,
      tags: NguMatChips,
      date: NguMatDate,
      daterange: NguMatDateRange,
    }),
  ];
}
