import { Component, computed, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';
import { provideNguMessages } from './messages';
import { applyMask, asciiDigits, formatLocalNumber, parseLocalNumber, unmask } from './transform';
import type { FormLoader, LeafDef } from './types';

const kinds = (errors: readonly { kind: string }[]) => errors.map((e) => e.kind);

function type(input: HTMLInputElement, value: string, caret = value.length) {
  input.value = value;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function controlFor(el: HTMLElement, label: string): HTMLInputElement {
  const lbl = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(label))!;
  return el.querySelector<HTMLInputElement>(`#${lbl.htmlFor}`)!;
}

describe('Date values', () => {
  it('infers a date input for Date values and checks bounds given as dates or strings', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm(
        { start: new Date('2026-03-01'), end: null as Date | null, due: '2026-02-01' },
        {
          start: { label: 'Start', min: '2026-01-01' },
          end: { label: 'End', type: 'date', max: new Date('2026-12-31') },
          due: { label: 'Due', type: 'date', min: new Date('2026-02-15') },
        },
      ),
    );
    expect((def.fields['start'] as LeafDef).type).toBe('date');
    expect(def.tree.start().errors()).toEqual([]);
    expect(kinds(def.tree.due().errors())).toEqual(['minDate']);
    def.model.update((m) => ({ ...m, start: new Date('2025-12-31'), end: new Date('2027-01-01') }));
    expect(kinds(def.tree.start().errors())).toEqual(['minDate']);
    expect(kinds(def.tree.end().errors())).toEqual(['maxDate']);
  });

  it('asks for a type when the value starts as null', () => {
    expect(() =>
      TestBed.runInInjectionContext(() =>
        // @ts-expect-error: `type: 'date'` is required for a nullable date
        defineForm({ end: null as Date | null }, { end: 'End' }),
      ),
    ).toThrowError(/Set "type" explicitly/);
  });

  @Component({ imports: [NguForm], template: `<ngu-form [form]="form" />` })
  class ValuesHost1 {
    readonly form = defineForm(
      { start: new Date('2026-03-01'), due: '' },
      { start: { label: 'Start', min: '2026-01-01', max: '2026-12-31' }, due: { label: 'Due', type: 'date', min: '2026-02-15' } },
    );
  }

  it('binds Date values to the date input and sets min and max', async () => {
    const fixture = TestBed.createComponent(ValuesHost1);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const start = controlFor(el, 'Start');
    expect(start.type).toBe('date');
    expect(start.value).toBe('2026-03-01');
    expect(start.getAttribute('min')).toBe('2026-01-01');
    expect(start.getAttribute('max')).toBe('2026-12-31');
    expect(controlFor(el, 'Due').getAttribute('min')).toBe('2026-02-15');

    start.value = '2026-04-15';
    start.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    const value = fixture.componentInstance.form.value().start;
    // jsdom's valueAsDate comes from its own realm, so compare by tag rather than instanceof.
    expect(Object.prototype.toString.call(value)).toBe('[object Date]');
    expect(value.toISOString()).toBe('2026-04-15T00:00:00.000Z');
  });

  it('formats date bounds in messages for the locale', async () => {
    @Component({
      imports: [NguForm],
      providers: [provideNguMessages({ locale: 'en-GB' })],
      template: `<ngu-form [form]="form" />`,
    })
    class GbHost {
      readonly form = defineForm({ due: '2026-01-01' }, { due: { label: 'Due', type: 'date', min: '2026-02-15', errorsOn: 'touched' } });
    }
    const fixture = TestBed.createComponent(GbHost);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(el.querySelector('.ngu-error')?.textContent).toBe('Due must be on or after 15 Feb 2026');
  });
});

describe('masks', () => {
  it('reads and writes masked text', () => {
    const phone = '(000) 000-0000';
    expect(unmask('(555) 123-4567', phone)).toBe('5551234567');
    expect(unmask('555.123.4567 ext', phone)).toBe('5551234567');
    expect(applyMask('5551234567', phone)).toBe('(555) 123-4567');
    expect(applyMask('5551', phone)).toBe('(555) 1');
    expect(applyMask('', phone)).toBe('');
    // A literal digit in the mask is skipped when typed in place.
    expect(unmask('+1 (555', '+1 (000) 000')).toBe('555');
    expect(unmask('ab12', 'aa-00')).toBe('ab12');
    expect(unmask('1a2b', 'aa-00')).toBe('ab');
    expect(asciiDigits('٠١٢٣ ०१२३ ０１')).toBe('0123 0123 01');
  });

  @Component({ imports: [NguForm], template: `<ngu-form [form]="form" />` })
  class ValuesHost2 {
    readonly form = defineForm(
      { phone: '', card: '4111111111111111' },
      { phone: { label: 'Phone', mask: '(000) 000-0000' }, card: { label: 'Card', mask: '0000 0000 0000 0000' } },
    );
  }

  let fixture: ComponentFixture<ValuesHost2>;
  let el: HTMLElement;
  beforeEach(async () => {
    fixture = TestBed.createComponent(ValuesHost2);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('formats while typing, keeps only the typed characters in the model, and keeps the caret', async () => {
    const phone = controlFor(el, 'Phone');
    expect(phone.getAttribute('inputmode')).toBe('numeric');
    expect(phone.getAttribute('dir')).toBe('ltr');
    expect(controlFor(el, 'Card').value).toBe('4111 1111 1111 1111');

    phone.focus();
    type(phone, '5551');
    expect(phone.value).toBe('(555) 1');
    expect(phone.selectionStart).toBe(7);
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().phone).toBe('5551');

    // Insert in the middle: caret stays after the typed digit.
    type(phone, '(5595) 1', 4);
    expect(phone.value).toBe('(559) 51');
    expect(phone.selectionStart).toBe(4);

    // Letters are refused, and the field shows the same text again.
    type(phone, '(559) 51x');
    expect(phone.value).toBe('(559) 51');
    type(phone, '(559) 51x');
    expect(phone.value).toBe('(559) 51');
  });

  it('reports a partly filled mask and follows writes from code', async () => {
    const def = fixture.componentInstance.form;
    def.patch({ phone: '555' });
    await fixture.whenStable();
    expect(controlFor(el, 'Phone').value).toBe('(555');
    expect(kinds(def.tree.phone().errors())).toEqual(['mask']);
    def.patch({ phone: '5551234567' });
    await fixture.whenStable();
    expect(def.tree.phone().errors()).toEqual([]);
  });
});

describe('locale numbers', () => {
  it('formats and reads numbers per locale, with native digits and Latin keyboards', () => {
    const opts = { maximumFractionDigits: 20 };
    expect(formatLocalNumber(1234567.5, 'en-US', opts)).toBe('1,234,567.5');
    expect(formatLocalNumber(1234567.5, 'de', opts)).toBe('1.234.567,5');
    expect(formatLocalNumber(1234567.5, 'hi', opts)).toBe('12,34,567.5');
    expect(formatLocalNumber(null, 'en-US', opts)).toBe('');

    expect(parseLocalNumber('1,234,567.5', 'en-US')).toBe(1234567.5);
    expect(parseLocalNumber('1.234.567,5', 'de')).toBe(1234567.5);
    expect(parseLocalNumber('12,34,567.5', 'hi')).toBe(1234567.5);
    expect(parseLocalNumber('١٬٢٣٤٫٥', 'ar-EG')).toBe(1234.5);
    expect(parseLocalNumber('1234.5', 'ar-EG')).toBe(1234.5);
    expect(parseLocalNumber('१२३४', 'hi')).toBe(1234);
    expect(parseLocalNumber('1 234,5', 'fr')).toBe(1234.5);
    expect(parseLocalNumber('−12', 'en-US')).toBe(-12);
    expect(parseLocalNumber('', 'en-US')).toBeNull();
    expect(parseLocalNumber('₹1,200.50', 'en-IN', { style: 'currency', currency: 'INR' })).toBe(1200.5);
    expect(parseLocalNumber('50%', 'en-US', { style: 'percent' })).toBe(0.5);
    expect(() => parseLocalNumber('12abc', 'en-US')).toThrow();
  });

  const locale = signal('en-US');

  @Component({
    imports: [NguForm],
    providers: [provideNguMessages(() => computed(() => ({ locale: locale() })))],
    template: `<ngu-form [form]="form" />`,
  })
  class ValuesHost3 {
    readonly form = defineForm(
      { salary: 1250000, price: 10 },
      {
        salary: { label: 'Salary', min: 0, localized: true },
        price: { label: 'Price', localized: { minimumFractionDigits: 2, maximumFractionDigits: 2 } },
      },
    );
  }

  beforeEach(() => locale.set('en-US'));

  it('shows the locale format, keeps typed text while focused and reformats on blur', async () => {
    const fixture = TestBed.createComponent(ValuesHost3);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const salary = controlFor(el, 'Salary');
    expect(salary.type).toBe('text');
    expect(salary.getAttribute('inputmode')).toBe('decimal');
    expect(salary.value).toBe('1,250,000');
    expect(controlFor(el, 'Price').value).toBe('10.00');

    salary.focus();
    type(salary, '2500000.');
    await fixture.whenStable();
    expect(salary.value).toBe('2500000.');
    expect(fixture.componentInstance.form.value().salary).toBe(2500000);
    salary.blur();
    await fixture.whenStable();
    expect(salary.value).toBe('2,500,000');

    locale.set('hi');
    await fixture.whenStable();
    expect(salary.value).toBe('25,00,000');
  });

  it('keeps unreadable text on screen and reports it', async () => {
    const fixture = TestBed.createComponent(ValuesHost3);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const salary = controlFor(el, 'Salary');
    salary.focus();
    type(salary, '12abc');
    salary.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(salary.value).toBe('12abc');
    expect(kinds(fixture.componentInstance.form.tree.salary().errors())).toEqual(['parse']);
    expect(fixture.componentInstance.form.value().salary).toBe(1250000);
  });
});

describe('parse and format', () => {
  @Component({ imports: [NguForm], template: `<ngu-form [form]="form" (submitted)="sent = $event" submitLabel="Go" />` })
  class ValuesHost4 {
    sent: unknown;
    readonly form = defineForm(
      { name: '', code: '' },
      {
        name: { label: 'Name', parse: (t) => t.trim() },
        code: {
          label: 'Code',
          parse: (t) => {
            if (t && !/^[a-z]+$/i.test(t)) {
              throw new Error('Letters only');
            }
            return t.toUpperCase();
          },
        },
      },
    );
  }

  it('stores the parsed value, keeps typing smooth and formats on blur', async () => {
    const fixture = TestBed.createComponent(ValuesHost4);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const name = controlFor(el, 'Name');
    name.focus();
    type(name, '  Ana ');
    await fixture.whenStable();
    expect(name.value).toBe('  Ana ');
    type(name, '  Ana Ruiz ');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().name).toBe('Ana Ruiz');
    name.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(name.value).toBe('Ana Ruiz');

    const code = controlFor(el, 'Code');
    code.focus();
    type(code, 'ab1');
    code.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(code.closest('ngu-field')!.querySelector('.ngu-error')?.textContent).toBe('Letters only');
    expect(fixture.componentInstance.sent).toBeUndefined();

    code.focus();
    type(code, 'ab');
    code.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(code.value).toBe('AB');
  });
});

describe('loading', () => {
  function fakeLoader<T>() {
    const value = signal<T | undefined>(undefined);
    const isLoading = signal(true);
    const error = signal<unknown>(undefined);
    const loader: FormLoader<T> = { value, isLoading, error };
    return { loader, value, isLoading, error };
  }

  it('shows placeholders until data arrives, then resets to it', async () => {
    const source = fakeLoader<{ name: string; bio: string }>();
    @Component({ imports: [NguForm], template: `<ngu-form [form]="form" submitLabel="Save" />` })
    class ValuesHost5 {
      readonly form = defineForm(
        { name: '', bio: '' },
        { name: 'Name', bio: { label: 'Bio', type: 'textarea' } },
        { load: source.loader },
      );
    }
    const fixture = TestBed.createComponent(ValuesHost5);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const def = fixture.componentInstance.form;
    expect(def.loading()).toBe(true);
    expect(el.querySelectorAll('.ngu-skeleton').length).toBe(2);
    expect(el.querySelector('.ngu-skeleton--area')).not.toBeNull();
    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.ngu-submit')?.getAttribute('aria-disabled')).toBe('true');
    expect(el.querySelector('[role="status"]')?.textContent).toBe('Loading…');

    source.value.set({ name: 'Ana', bio: 'Hi' });
    source.isLoading.set(false);
    await fixture.whenStable();
    expect(def.loading()).toBe(false);
    expect(el.querySelector('.ngu-skeleton')).toBeNull();
    expect(controlFor(el, 'Name').value).toBe('Ana');
    expect(def.dirty()).toBe(false);
    expect(def.changes()).toEqual({});

    def.patch({ name: 'Bo' });
    def.reset();
    expect(def.value().name).toBe('Ana');
  });

  it('shows a message when loading fails', async () => {
    const source = fakeLoader<{ name: string }>();
    @Component({ imports: [NguForm], template: `<ngu-form [form]="form" />` })
    class ValuesHost6 {
      readonly form = defineForm({ name: '' }, { name: 'Name' }, { load: source.loader });
    }
    const fixture = TestBed.createComponent(ValuesHost6);
    const el: HTMLElement = fixture.nativeElement;
    source.isLoading.set(false);
    source.error.set(new Error('500'));
    await fixture.whenStable();
    expect(el.querySelector('.ngu-form-error')?.textContent).toBe('The form could not be loaded.');
    expect(el.querySelector('.ngu-skeleton')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
    expect(fixture.componentInstance.form.loading()).toBe(false);
  });
});
