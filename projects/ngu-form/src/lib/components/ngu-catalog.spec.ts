import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { NguCaptchaAdapter, NguCaptchaEvents } from '../captcha';
import { defineForm } from '../define';
import { NguForm } from './ngu-form';

const COLORS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];
const SIZES = [
  { value: 1, label: 'Small' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Large' },
];

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function fieldByLabel(el: HTMLElement, label: string): HTMLElement {
  const legend = Array.from(el.querySelectorAll('legend, label, .ngu-label')).find(
    (l) => l.textContent?.replace('*', '').trim() === label,
  );
  return legend!.closest('ngu-field') as HTMLElement;
}

describe('choice types', () => {
  @Component({
    selector: 'catalog-host-1',
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Save" />`,
  })
  class Host {
    readonly form = defineForm(
      {
        colors: ['blue'] as string[],
        sizes: [] as number[],
        size: 2,
        pick: 0,
        view: 'list',
        lone: [] as number[],
      },
      {
        colors: { label: 'Colors', type: 'checkbox', options: COLORS, max: 2 },
        sizes: { label: 'Sizes', type: 'select', options: SIZES },
        size: { label: 'Size', type: 'radio', options: SIZES },
        pick: { label: 'Pick', type: 'select', options: SIZES, placeholder: 'Choose…' },
        view: {
          label: 'View',
          type: 'segmented',
          options: [
            { value: 'list', label: 'List' },
            { value: 'grid', label: 'Grid' },
          ],
        },
        lone: { label: 'Lone', type: 'checkbox', options: SIZES, required: true },
      },
    );
  }

  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  let host: Host;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement;
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders a checkbox group as a labelled fieldset that writes values in option order', async () => {
    const field = fieldByLabel(el, 'Colors');
    const fieldset = field.querySelector('fieldset')!;
    expect(fieldset.getAttribute('role')).toBeNull();
    expect(
      el.querySelector(`#${fieldset.getAttribute('aria-labelledby')}`)?.textContent?.trim(),
    ).toBe('Colors');
    const boxes = Array.from(field.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(boxes.map((b) => b.checked)).toEqual([false, false, true]);
    boxes[0].click();
    await fixture.whenStable();
    expect(host.form.value().colors).toEqual(['red', 'blue']);
    boxes[2].click();
    await fixture.whenStable();
    expect(host.form.value().colors).toEqual(['red']);
  });

  it('keeps number values as numbers in radios and selects', async () => {
    const radios = Array.from(
      fieldByLabel(el, 'Size').querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    expect(radios.map((r) => r.checked)).toEqual([false, true, false]);
    radios[2].click();
    await fixture.whenStable();
    expect(host.form.value().size).toBe(3);

    const pick = fieldByLabel(el, 'Pick').querySelector('select')!;
    expect(pick.selectedOptions[0]?.textContent?.trim()).toBe('Choose…');
    pick.value = '1';
    pick.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(host.form.value().pick).toBe(2);
    host.form.patch({ pick: 3 });
    await fixture.whenStable();
    expect(pick.selectedOptions[0]?.textContent?.trim()).toBe('Large');
  });

  it('renders a multiple select for a list value', async () => {
    const select = fieldByLabel(el, 'Sizes').querySelector('select')!;
    expect(select.multiple).toBe(true);
    expect(select.getAttribute('size')).toBe('3');
    select.options[0].selected = true;
    select.options[2].selected = true;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(host.form.value().sizes).toEqual([1, 3]);
    host.form.patch({ sizes: [2] });
    await fixture.whenStable();
    expect(Array.from(select.selectedOptions).map((o) => o.textContent?.trim())).toEqual([
      'Medium',
    ]);
  });

  it('renders a segmented control as a radiogroup of buttons', async () => {
    const field = fieldByLabel(el, 'View');
    expect(field.querySelector('fieldset')?.getAttribute('role')).toBe('radiogroup');
    expect(field.querySelector('ngu-choices')?.classList).toContain('ngu-choices--buttons');
    field.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    await fixture.whenStable();
    expect(host.form.value().view).toBe('grid');
  });

  it('marks each checkbox invalid, not the group, after a refused submit', async () => {
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    const field = fieldByLabel(el, 'Lone');
    expect(field.querySelector('.ngu-error')?.textContent?.trim()).toBe('Lone is required');
    expect(field.querySelector('fieldset')?.hasAttribute('aria-invalid')).toBe(false);
    expect(field.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(field.querySelector('fieldset')?.getAttribute('aria-describedby')).toContain('-msg');
  });
});

describe('input types', () => {
  let tokens: NguCaptchaEvents | undefined;
  let resets = 0;
  const fakeCaptcha: NguCaptchaAdapter = {
    render(host, events) {
      tokens = events;
      host.textContent = 'captcha widget';
      return { reset: () => resets++ };
    },
  };

  @Component({
    selector: 'catalog-host-2',
    imports: [NguForm],
    template: `<ngu-form [form]="form" [action]="save" submitLabel="Save" />`,
  })
  class Host {
    saved = 0;
    readonly save = () => {
      this.saved++;
      return undefined;
    };
    readonly form = defineForm(
      {
        on: false,
        volume: 40,
        color: '#336699',
        start: '',
        site: '',
        price: 0,
        stars: 0,
        stay: { from: null as Date | null, to: null as Date | null },
        code: '',
        phone: '',
        skills: ['angular'] as string[],
        agreed: null as Date | null,
        human: '',
      },
      {
        on: { label: 'Notifications', type: 'switch' },
        volume: { label: 'Volume', type: 'range', max: 100, step: 5, suffix: '%' },
        color: { label: 'Color', type: 'color' },
        start: { label: 'Start', type: 'time', min: '09:00' },
        site: { label: 'Website', type: 'url' },
        price: { label: 'Price', type: 'currency', currency: 'INR', min: 0 },
        stars: { label: 'Stars', type: 'rating' },
        stay: { label: 'Stay', type: 'daterange' },
        code: { label: 'Code', type: 'otp', length: 6 },
        phone: { label: 'Phone', type: 'phone', country: 'IN' },
        skills: { label: 'Skills', type: 'tags' },
        agreed: {
          label: 'I accept the terms',
          type: 'consent',
          required: true,
          policy: { href: '/terms', label: 'Terms' },
        },
        human: { type: 'captcha', captcha: fakeCaptcha },
      },
    );
  }

  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  let host: Host;
  const input = (label: string, selector = 'input') =>
    fieldByLabel(el, label).querySelector<HTMLInputElement>(selector)!;

  beforeEach(async () => {
    tokens = undefined;
    resets = 0;
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement;
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders a switch as a checkbox with the switch role', async () => {
    const toggle = input('Notifications');
    expect(toggle.getAttribute('role')).toBe('switch');
    toggle.click();
    await fixture.whenStable();
    expect(host.form.value().on).toBe(true);
  });

  it('shows a slider value with its suffix, and reads it the same way', async () => {
    const slider = input('Volume');
    expect(slider.type).toBe('range');
    expect(slider.getAttribute('aria-valuetext')).toBe('40 %');
    expect(slider.max).toBe('100');
    expect(slider.step).toBe('5');
    type(slider, '65');
    await fixture.whenStable();
    expect(host.form.value().volume).toBe(65);
    expect(fieldByLabel(el, 'Volume').querySelector('.ngu-range__value')?.textContent?.trim()).toBe(
      '65 %',
    );
  });

  it('renders color, time and URL inputs natively', async () => {
    expect(input('Color').type).toBe('color');
    expect(fieldByLabel(el, 'Color').querySelector('.ngu-color__value')?.textContent).toBe(
      '#336699',
    );
    expect(input('Start').type).toBe('time');
    expect(input('Start').getAttribute('min')).toBe('09:00');
    const site = input('Website');
    expect(site.type).toBe('url');
    type(site, 'example.com');
    site.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await fixture.whenStable();
    expect(host.form.value().site).toBe('https://example.com');
  });

  it('formats an amount in its currency once the field is left', async () => {
    const price = input('Price');
    expect(price.type).toBe('text');
    expect(price.getAttribute('inputmode')).toBe('decimal');
    price.focus();
    type(price, '1234.5');
    await fixture.whenStable();
    expect(host.form.value().price).toBe(1234.5);
    price.dispatchEvent(new Event('blur'));
    price.blur();
    await fixture.whenStable();
    expect(price.value).toBe('₹1,234.50');
  });

  it('rates with stars, and a second click on the chosen star clears it', async () => {
    const field = fieldByLabel(el, 'Stars');
    expect(field.querySelector('fieldset')?.getAttribute('role')).toBe('radiogroup');
    const labels = Array.from(field.querySelectorAll<HTMLLabelElement>('label.ngu-star'));
    expect(labels.map((l) => l.querySelector('span.ngu-sr-only')?.textContent)).toEqual([
      '1 star',
      '2 stars',
      '3 stars',
      '4 stars',
      '5 stars',
    ]);
    labels[3].querySelector('input')!.click();
    await fixture.whenStable();
    expect(host.form.value().stars).toBe(4);
    labels[3]
      .querySelector<HTMLElement>('.ngu-star__mark')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await fixture.whenStable();
    expect(host.form.value().stars).toBe(0);
  });

  it('edits a date range through two labelled inputs that limit each other', async () => {
    const field = fieldByLabel(el, 'Stay');
    const [from, to] = Array.from(field.querySelectorAll<HTMLInputElement>('input[type="date"]'));
    expect(el.querySelector(`label[for="${from.id}"]`)?.textContent?.trim()).toBe('From');
    expect(el.querySelector(`label[for="${to.id}"]`)?.textContent?.trim()).toBe('To');
    type(from, '2026-03-10');
    await fixture.whenStable();
    expect(host.form.value().stay.from?.toISOString()).toBe('2026-03-10T00:00:00.000Z');
    expect(to.getAttribute('min')).toBe('2026-03-10');
    type(to, '2026-03-12');
    await fixture.whenStable();
    expect(host.form.value().stay.to?.toISOString()).toBe('2026-03-12T00:00:00.000Z');
  });

  it('reads a one-time code from one autofillable input', async () => {
    const code = input('Code');
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');
    code.focus();
    type(code, '12-34 5');
    await fixture.whenStable();
    expect(host.form.value().code).toBe('12345');
    const boxes = Array.from(fieldByLabel(el, 'Code').querySelectorAll('.ngu-otp__box')).map(
      (b) => b.textContent,
    );
    expect(boxes).toEqual(['1', '2', '3', '4', '5', '']);
  });

  it('stores phone numbers as E.164 and picks the country of a pasted number', async () => {
    const field = fieldByLabel(el, 'Phone');
    const country = field.querySelector('select')!;
    const number = field.querySelector<HTMLInputElement>('input[type="tel"]')!;
    expect(country.value).toBe('IN');
    expect(country.getAttribute('aria-label')).toBe('Country code');
    type(number, '098765 43210');
    await fixture.whenStable();
    expect(host.form.value().phone).toBe('+919876543210');
    type(number, '+44 7911 123456');
    await fixture.whenStable();
    expect(country.value).toBe('GB');
    expect(number.value).toBe('7911123456');
    expect(host.form.value().phone).toBe('+447911123456');
    host.form.patch({ phone: '+14155552671' });
    await fixture.whenStable();
    expect(country.value).toBe('US');
    expect(number.value).toBe('4155552671');
  });

  it('adds tags with Enter, separators and paste, and removes them', async () => {
    const field = fieldByLabel(el, 'Skills');
    const text = field.querySelector<HTMLInputElement>('input')!;
    const keydown = (key: string) =>
      text.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    type(text, 'signals');
    keydown('Enter');
    await fixture.whenStable();
    expect(host.form.value().skills).toEqual(['angular', 'signals']);
    type(text, 'rxjs,zod,');
    await fixture.whenStable();
    expect(host.form.value().skills).toEqual(['angular', 'signals', 'rxjs', 'zod']);
    type(text, 'Angular');
    keydown('Enter');
    await fixture.whenStable();
    expect(host.form.value().skills).toHaveLength(4);
    expect(field.querySelector('[aria-live]')?.textContent).toBe('Angular is already in the list');
    keydown('Backspace');
    await fixture.whenStable();
    expect(host.form.value().skills).toEqual(['angular', 'signals', 'rxjs']);
    field.querySelector<HTMLButtonElement>('button[aria-label="Remove angular"]')!.click();
    await fixture.whenStable();
    expect(host.form.value().skills).toEqual(['signals', 'rxjs']);
    expect(field.querySelector('[aria-live]')?.textContent).toBe('Removed angular');
  });

  it('stores the time of consent and links the policy in a new tab', async () => {
    const field = fieldByLabel(el, 'I accept the terms');
    const box = field.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(box.required).toBe(true);
    const link = field.querySelector<HTMLAnchorElement>('a.ngu-policy')!;
    expect(link.target).toBe('_blank');
    expect(link.textContent).toBe('Terms (opens in a new tab)');
    box.click();
    await fixture.whenStable();
    expect(host.form.value().agreed).toBeInstanceOf(Date);
    box.click();
    await fixture.whenStable();
    expect(host.form.value().agreed).toBeNull();
  });

  it('takes the captcha token as the value and resets the widget after a submit', async () => {
    const group = el.querySelector<HTMLElement>('.ngu-captcha-group')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Security check');
    expect(group.textContent).toContain('captcha widget');
    host.form.patch({ agreed: new Date() });
    tokens!.token('tok-1');
    await fixture.whenStable();
    expect(host.form.value().human).toBe('tok-1');
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    expect(host.saved).toBe(1);
    expect(resets).toBe(1);
    expect(host.form.value().human).toBe('');
    expect(host.form.dirty()).toBe(false);
  });

  it('shows a captcha that failed to load as an error', async () => {
    tokens!.error();
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    expect(group().querySelector('.ngu-error')?.textContent?.trim()).toBe(
      'The check could not load. Reload the page and try again.',
    );
    function group() {
      return el.querySelector('.ngu-captcha-group')!.closest('ngu-field')!;
    }
  });
});
