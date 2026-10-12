import type { Provider } from '@angular/core';
import { provideNguFieldRenderers } from 'ngu-form';
import { NguPrimeCheck } from './check';
import { NguPrimeChoice } from './choice';
import { NguPrimeInput } from './input';
import { NguPrimeDate, NguPrimeRating, NguPrimeSlider } from './misc';
import { NguPrimeNumber } from './number';
import { NguPrimeSelect } from './select';

/**
 * Renders fields with PrimeNG. Text fields become `pInputText` (with input group add-ons,
 * `p-inputmask` for masks), passwords `p-password`, textareas `pTextarea`, numbers and amounts
 * `p-inputnumber`, selects `p-select` and `p-multiselect`, checkboxes and switches `p-checkbox`
 * and `p-toggleswitch`, radios `p-radiobutton`, segments `p-selectbutton`, sliders `p-slider`,
 * dates and ranges `p-datepicker` and ratings `p-rating`. Tags, one-time codes, phone, color and
 * captcha keep ngu-form's own controls: `p-inputtags` and `p-inputotp` render an unnamed empty
 * listbox and unlabeled inputs. Set the PrimeNG theme with `providePrimeNG` as usual.
 *
 * ```ts
 * providers: [providePrimeNG({ theme: { preset: Aura } }), provideNguPrimeNG()]
 * ```
 */
export function provideNguPrimeNG(): Provider {
  return provideNguFieldRenderers({
    text: NguPrimeInput,
    email: NguPrimeInput,
    password: NguPrimeInput,
    url: NguPrimeInput,
    search: NguPrimeInput,
    tel: NguPrimeInput,
    textarea: NguPrimeInput,
    time: NguPrimeInput,
    'datetime-local': NguPrimeInput,
    month: NguPrimeInput,
    week: NguPrimeInput,
    number: NguPrimeNumber,
    currency: NguPrimeNumber,
    select: NguPrimeSelect,
    checkbox: NguPrimeCheck,
    switch: NguPrimeCheck,
    consent: NguPrimeCheck,
    radio: NguPrimeChoice,
    segmented: NguPrimeChoice,
    range: NguPrimeSlider,
    date: NguPrimeDate,
    daterange: NguPrimeDate,
    rating: NguPrimeRating,
  });
}
